import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { taskListsApi, tasksApi, taskMetadata, titlePrefix, AuthenticationError, createAuthRetryWrapper } from '../services/googleTasksApi';
import { delegationsApi, getDelegationIdFromNotes, addDelegationIdToNotes } from '../services/delegationsApi';
import { DEFAULT_TIME_HORIZON } from '../constants/timeHorizon';
import { isOnMatrix, isInBacklog } from '../utils/taskFilters';

const TaskContext = createContext(null);

function enrichTask(task, list) {
  const { quadrant, delegatedTo, cleanTitle } = titlePrefix.parse(task.title);
  const notesMeta = taskMetadata.parse(task.notes);

  const metadata = {
    timeHorizon: notesMeta.timeHorizon || DEFAULT_TIME_HORIZON,
    quadrant: titlePrefix.hasPrefix(task.title) ? quadrant : (notesMeta.quadrant || null),
    delegatedTo: titlePrefix.hasPrefix(task.title) ? delegatedTo : (notesMeta.delegatedTo || null),
  };

  return {
    ...task,
    listId: list.id,
    listTitle: list.title,
    metadata,
    cleanTitle,
    displayNotes: taskMetadata.getDisplayNotes(task.notes),
  };
}

// Lighter enrichment for Subtasks — no quadrant/time-horizon metadata parsing.
// Subtasks carry only title, due date, and status; no EISENHOWER_META block.
function enrichSubtask(task, list) {
  return {
    ...task,
    listId: list.id,
    listTitle: list.title,
    cleanTitle: task.title || '',
    displayNotes: task.notes || '',
    subtasks: [], // Subtasks cannot have their own subtasks (one level only)
  };
}

// Action types
const ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_TASK_LISTS: 'SET_TASK_LISTS',
  SET_TASKS: 'SET_TASKS',
  ADD_TASK: 'ADD_TASK',
  UPDATE_TASK: 'UPDATE_TASK',
  REMOVE_TASK: 'REMOVE_TASK',
  ADD_TASK_LIST: 'ADD_TASK_LIST',
  SET_SHOW_COMPLETED: 'SET_SHOW_COMPLETED',
  SET_PRIMARY_LIST: 'SET_PRIMARY_LIST',
  SET_SENT_DELEGATIONS: 'SET_SENT_DELEGATIONS',
};

const initialState = {
  taskLists: [],       // Google Task Lists (categories)
  primaryListId: null, // The user's primary/first list
  tasks: [],           // All tasks from all lists
  sentDelegations: [], // Delegations I sent (for sync and badges)
  isLoading: false,
  error: null,
  showCompleted: {     // Track show/hide completed per quadrant
    do: false,
    delegate: false,
    delay: false,
    delete: false,
  },
};

function taskReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.payload };
    
    case ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, isLoading: false };
    
    case ACTIONS.SET_TASK_LISTS:
      return { ...state, taskLists: action.payload };
    
    case ACTIONS.SET_PRIMARY_LIST:
      return { ...state, primaryListId: action.payload };
    
    case ACTIONS.SET_TASKS:
      return { ...state, tasks: action.payload, isLoading: false };
    
    case ACTIONS.ADD_TASK:
      return { ...state, tasks: [...state.tasks, action.payload] };
    
    case ACTIONS.UPDATE_TASK:
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.payload.id ? { ...task, ...action.payload } : task
        ),
      };
    
    case ACTIONS.REMOVE_TASK:
      return {
        ...state,
        tasks: state.tasks.filter((task) => task.id !== action.payload),
      };
    
    case ACTIONS.ADD_TASK_LIST:
      return { ...state, taskLists: [...state.taskLists, action.payload] };
    
    case ACTIONS.SET_SHOW_COMPLETED:
      return {
        ...state,
        showCompleted: {
          ...state.showCompleted,
          [action.payload.quadrant]: action.payload.show,
        },
      };
    
    case ACTIONS.SET_SENT_DELEGATIONS:
      return { ...state, sentDelegations: action.payload };
    
    default:
      return state;
  }
}

export function TaskProvider({ children }) {
  const { accessToken, isAuthenticated, markNeedsReauth, refreshTokenAsync, user } = useAuth();
  // Email for delegation API (from auth context or localStorage so backend doesn't need to call Google)
  const userEmail = useMemo(() => {
    if (user?.email) return user.email;
    try {
      const stored = localStorage.getItem('google_user');
      return stored ? JSON.parse(stored).email : null;
    } catch {
      return null;
    }
  }, [user?.email]);
  const [state, dispatch] = useReducer(taskReducer, initialState);

  // Create the auth retry wrapper - memoized to prevent recreation on every render
  const withAuthRetry = useMemo(() => {
    if (!refreshTokenAsync || !accessToken) {
      // Return a passthrough function if not ready
      return (apiCallFactory) => apiCallFactory(accessToken);
    }
    return createAuthRetryWrapper(refreshTokenAsync, () => accessToken);
  }, [refreshTokenAsync, accessToken]);

  // Fetch all task lists (categories)
  const fetchTaskLists = useCallback(async () => {
    if (!accessToken) return [];
    
    try {
      const lists = await withAuthRetry((token) => taskListsApi.getAll(token));
      dispatch({ type: ACTIONS.SET_TASK_LISTS, payload: lists });
      
      // Set the first list as primary (for uncategorized tasks)
      if (lists.length > 0) {
        dispatch({ type: ACTIONS.SET_PRIMARY_LIST, payload: lists[0].id });
      }
      
      return lists;
    } catch (error) {
      console.error('Failed to fetch task lists:', error);
      throw error;
    }
  }, [accessToken, withAuthRetry]);

  // Sync sent delegations: fetch from API, update Google tasks for completed/declined.
  // Only depends on accessToken/withAuthRetry so it stays stable and does not retrigger fetchTasks effect.
  const syncSentDelegations = useCallback(async (tasksOverride = []) => {
    if (!accessToken) return;
    try {
      const sent = await withAuthRetry((token) => delegationsApi.getSent(token, userEmail));
      dispatch({ type: ACTIONS.SET_SENT_DELEGATIONS, payload: sent });
      const tasksList = tasksOverride;
      for (const d of sent) {
        if (!d.sourceListId || !d.sourceTaskId) continue;
        if (d.status === 'completed') {
          try {
            await withAuthRetry((token) =>
              tasksApi.update(token, d.sourceListId, d.sourceTaskId, { status: 'completed' })
            );
          } catch (e) {
            console.warn('Failed to sync completed delegation to Google task:', e);
          }
        } else if (d.status === 'declined') {
          const task = tasksList.find(
            (t) => t.listId === d.sourceListId && t.id === d.sourceTaskId
          );
          const noteSuffix = `\nDeclined by ${d.toEmail} on ${d.declinedAt || ''}`;
          const newNotes = (task?.notes || task?.displayNotes || '') + noteSuffix;
          try {
            await withAuthRetry((token) =>
              tasksApi.update(token, d.sourceListId, d.sourceTaskId, { notes: newNotes })
            );
          } catch (e) {
            console.warn('Failed to sync declined delegation to Google task:', e);
          }
        }
      }
    } catch (e) {
      if (!import.meta.env.VITE_API_URL) return;
      console.warn('Failed to fetch sent delegations:', e);
    }
  }, [accessToken, withAuthRetry, userEmail]);

  // Fetch all tasks from all lists
  const fetchTasks = useCallback(async () => {
    if (!accessToken) return;
    
    dispatch({ type: ACTIONS.SET_LOADING, payload: true });
    
    try {
      // First get all task lists
      const lists = await fetchTaskLists();
      
      if (lists.length === 0) {
        dispatch({ type: ACTIONS.SET_TASKS, payload: [] });
        return;
      }
      
      // Fetch tasks from each list in parallel
      const tasksPromises = lists.map(async (list) => {
        try {
          const tasks = await withAuthRetry((token) => tasksApi.getAll(token, list.id, true, true));
          // Subtasks (tasks with a `parent` field) get lighter enrichment — no metadata parsing.
          // Top-level tasks get full enrichment including quadrant/time-horizon metadata.
          return tasks.map((task) =>
            task.parent ? enrichSubtask(task, list) : enrichTask(task, list)
          );
        } catch (error) {
          // Re-throw authentication errors to be handled at top level
          if (error instanceof AuthenticationError) {
            throw error;
          }
          console.error(`Failed to fetch tasks from list ${list.title}:`, error);
          return [];
        }
      });
      
      const tasksArrays = await Promise.all(tasksPromises);
      const allEnrichedTasks = tasksArrays.flat();

      // Group subtasks under their parent tasks.
      // Subtasks come back flat from Google Tasks API with a `parent` field set.
      // We attach them to parent.subtasks and exclude them from the top-level list.
      const taskMap = new Map();
      const topLevelTasks = [];

      // First pass: index top-level tasks and initialise their subtasks array
      for (const task of allEnrichedTasks) {
        if (!task.parent) {
          if (!task.subtasks) task.subtasks = [];
          taskMap.set(task.id, task);
          topLevelTasks.push(task);
        }
      }

      // Second pass: attach subtasks to parents; orphans surface as top-level tasks
      for (const task of allEnrichedTasks) {
        if (task.parent) {
          const parentTask = taskMap.get(task.parent);
          if (parentTask) {
            parentTask.subtasks.push(task);
          } else {
            // Parent not found (e.g. beyond the 100-task fetch limit) — treat as top-level
            console.warn(`Subtask ${task.id} has no matching parent ${task.parent} — surfacing as top-level`);
            topLevelTasks.push(task);
          }
        }
      }

      dispatch({ type: ACTIONS.SET_TASKS, payload: topLevelTasks });
      syncSentDelegations(topLevelTasks);
    } catch (error) {
      // Handle 401 authentication errors by marking re-auth needed
      if (error instanceof AuthenticationError) {
        console.log('Authentication error detected, marking re-auth needed');
        markNeedsReauth();
        return;
      }
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
    } finally {
      dispatch({ type: ACTIONS.SET_LOADING, payload: false });
    }
  }, [accessToken, fetchTaskLists, markNeedsReauth, withAuthRetry, syncSentDelegations]);

  // Load tasks when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchTasks();
    }
  }, [isAuthenticated, fetchTasks]);

  // Get list ID for a category (or primary list if no category)
  const getListIdForCategory = useCallback((categoryListId) => {
    if (categoryListId) {
      // Check if this list exists
      const list = state.taskLists.find((l) => l.id === categoryListId);
      if (list) return categoryListId;
    }
    // Fall back to primary list
    return state.primaryListId;
  }, [state.taskLists, state.primaryListId]);

  // Get list title by ID
  const getListTitle = useCallback((listId) => {
    const list = state.taskLists.find((l) => l.id === listId);
    return list?.title || null;
  }, [state.taskLists]);

  // Create a new task
  const createTask = useCallback(async (taskData) => {
    if (!accessToken) return;
    
    const targetListId = getListIdForCategory(taskData.categoryListId);
    if (!targetListId) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: 'No task list available' });
      return;
    }
    
    const timeHorizon = taskData.timeHorizon || DEFAULT_TIME_HORIZON;
    const quadrant = taskData.quadrant || null;
    const delegatedTo = taskData.delegatedTo || null;
    const due = taskData.due || null;
    const inExecutionSet = Boolean(quadrant && due);
    
    const prefixedTitle = inExecutionSet
      ? titlePrefix.create(taskData.title, quadrant, delegatedTo)
      : titlePrefix.create(taskData.title, null);
    
    const serializedNotes = taskMetadata.serialize(taskData.notes || '', { timeHorizon });
    
    const taskPayload = {
      title: prefixedTitle,
      due,
      status: 'needsAction',
    };
    if (serializedNotes) {
      taskPayload.notes = serializedNotes;
    }
    
    try {
      const newTask = await withAuthRetry((token) => tasksApi.create(token, targetListId, taskPayload));
      
      const enrichedTask = enrichTask(newTask, { id: targetListId, title: getListTitle(targetListId) });
      
      dispatch({ type: ACTIONS.ADD_TASK, payload: enrichedTask });
      return enrichedTask;
    } catch (error) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, [accessToken, getListIdForCategory, getListTitle, withAuthRetry]);

  // Update a task (within the same list)
  const updateTask = useCallback(async (taskId, updates) => {
    if (!accessToken) return;
    
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) {
      console.error('Task not found for update:', taskId);
      return;
    }
    
    if (!task.listId) {
      console.error('Task has no listId:', task);
      return;
    }
    
    const existingMeta = task.metadata || {};
    const timeHorizon = updates.timeHorizon !== undefined ? updates.timeHorizon : (existingMeta.timeHorizon || DEFAULT_TIME_HORIZON);
    
    const newQuadrant = updates.quadrant !== undefined ? updates.quadrant : existingMeta.quadrant;
    const newDelegatedTo = updates.delegatedTo !== undefined ? updates.delegatedTo : (existingMeta.delegatedTo || null);
    const newDue = updates.due !== undefined ? updates.due : task.due;
    const inExecutionSet = Boolean(newQuadrant && newDue);
    
    const newMetadata = {
      timeHorizon,
      quadrant: inExecutionSet ? newQuadrant : null,
      delegatedTo: inExecutionSet && newQuadrant === 'delegate' ? newDelegatedTo : null,
    };
    
    const existingCleanTitle = task.cleanTitle || (task.title ? titlePrefix.parse(task.title).cleanTitle : '');
    const cleanTitle = updates.title !== undefined ? updates.title : existingCleanTitle;
    
    const prefixedTitle = inExecutionSet
      ? titlePrefix.create(cleanTitle, newMetadata.quadrant, newMetadata.delegatedTo)
      : titlePrefix.create(cleanTitle, null);
    
    const taskPayload = {
      title: prefixedTitle,
    };
    
    if (updates.due !== undefined) {
      taskPayload.due = updates.due;
    } else if (!inExecutionSet) {
      taskPayload.due = null;
    }
    if (updates.status !== undefined) {
      taskPayload.status = updates.status;
    }
    
    const notesValue = updates.notes !== undefined ? updates.notes : (task.displayNotes || '');
    const serializedNotes = taskMetadata.serialize(notesValue, { timeHorizon });
    taskPayload.notes = serializedNotes || '';
    
    try {
      // Optimistic update
      dispatch({
        type: ACTIONS.UPDATE_TASK,
        payload: {
          id: taskId,
          title: prefixedTitle,
          cleanTitle,
          metadata: newMetadata,
          ...(updates.due !== undefined && { due: updates.due }),
          ...(!inExecutionSet && updates.due === undefined && { due: null }),
          ...(updates.status !== undefined && { status: updates.status }),
          displayNotes: notesValue,
          notes: serializedNotes || null,
        },
      });
      
      await withAuthRetry((token) => tasksApi.update(token, task.listId, taskId, taskPayload));
    } catch (error) {
      console.error('Failed to update task:', error, { taskId, listId: task.listId, taskPayload });
      // Revert on error
      dispatch({ type: ACTIONS.UPDATE_TASK, payload: task });
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, [accessToken, state.tasks, withAuthRetry]);

  // Change task category (move to different list)
  const changeTaskCategory = useCallback(async (taskId, newListId) => {
    if (!accessToken) return;
    
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;
    
    // If same list, no need to move
    if (task.listId === newListId) return task;
    
    const targetListId = newListId || state.primaryListId;
    if (!targetListId) return;
    
    // Ensure we have a valid title
    const taskTitle = task.title || titlePrefix.create(task.cleanTitle || 'Untitled', task.metadata?.quadrant || 'do', task.metadata?.delegatedTo);
    
    try {
      // Create task in new list (keep the same prefixed title)
      const newTask = await withAuthRetry((token) => tasksApi.move(token, task.listId, targetListId, {
        id: task.id,
        title: taskTitle,
        notes: task.notes,
        due: task.due,
        status: task.status,
      }));
      
      // Remove old task from state
      dispatch({ type: ACTIONS.REMOVE_TASK, payload: taskId });
      
      const enrichedTask = enrichTask(newTask, { id: targetListId, title: getListTitle(targetListId) });
      
      dispatch({ type: ACTIONS.ADD_TASK, payload: enrichedTask });
      return enrichedTask;
    } catch (error) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, [accessToken, state.tasks, state.primaryListId, getListTitle, withAuthRetry]);

  // Move task to different quadrant
  const moveTask = useCallback(async (taskId, targetQuadrant, additionalData = {}) => {
    return updateTask(taskId, {
      quadrant: targetQuadrant,
      ...additionalData,
    });
  }, [updateTask]);

  // Delete a task - accepts either taskId or task object with listId
  const deleteTask = useCallback(async (taskIdOrTask) => {
    if (!accessToken) return;
    
    // Support both task object and taskId
    let taskId, listId, taskForRevert;
    
    if (typeof taskIdOrTask === 'object' && taskIdOrTask.id) {
      // Task object passed directly
      taskId = taskIdOrTask.id;
      listId = taskIdOrTask.listId;
      taskForRevert = taskIdOrTask;
    } else {
      // TaskId passed, need to find the task
      taskId = taskIdOrTask;
      taskForRevert = state.tasks.find((t) => t.id === taskId);
      if (!taskForRevert) {
        console.error('Task not found for deletion:', taskId);
        return;
      }
      listId = taskForRevert.listId;
    }
    
    if (!listId) {
      console.error('No listId available for task deletion');
      return;
    }
    
    try {
      // Optimistic delete
      dispatch({ type: ACTIONS.REMOVE_TASK, payload: taskId });
      
      await withAuthRetry((token) => tasksApi.delete(token, listId, taskId));
    } catch (error) {
      console.error('Failed to delete task:', error, { taskId, listId });
      // Revert on error
      dispatch({ type: ACTIONS.ADD_TASK, payload: taskForRevert });
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, [accessToken, state.tasks, withAuthRetry]);

  // Toggle task completion
  const toggleComplete = useCallback(async (taskId) => {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;
    
    const newStatus = task.status === 'completed' ? 'needsAction' : 'completed';
    await updateTask(taskId, { status: newStatus });
    if (newStatus === 'completed' && accessToken) {
      const delegationId = getDelegationIdFromNotes(task.notes);
      if (delegationId) {
        try {
          await withAuthRetry((token) => delegationsApi.complete(token, delegationId, userEmail));
        } catch (e) {
          console.warn('Failed to notify delegation complete:', e);
        }
      }
    }
  }, [state.tasks, updateTask, accessToken, withAuthRetry]);

  // Toggle show completed for a quadrant
  const toggleShowCompleted = useCallback((quadrant) => {
    dispatch({
      type: ACTIONS.SET_SHOW_COMPLETED,
      payload: { quadrant, show: !state.showCompleted[quadrant] },
    });
  }, [state.showCompleted]);

  // Get tasks by quadrant (execution set only: due on/before today)
  const getTasksByQuadrant = useCallback((quadrant) => {
    return state.tasks.filter((task) => {
      if (!isOnMatrix(task)) return false;
      const taskQuadrant = task.metadata?.quadrant;
      if (!taskQuadrant || taskQuadrant !== quadrant) return false;
      const isCompleted = task.status === 'completed';
      
      if (isCompleted && !state.showCompleted[quadrant]) return false;
      
      return true;
    });
  }, [state.tasks, state.showCompleted]);

  const getBacklogTasksByHorizon = useCallback((horizon) => {
    return state.tasks.filter((task) => {
      if (!isInBacklog(task)) return false;
      return (task.metadata?.timeHorizon || DEFAULT_TIME_HORIZON) === horizon;
    });
  }, [state.tasks]);

  const getGuardrailWarnings = useCallback(() => {
    const warnings = [];
    const doActive = getTasksByQuadrant('do').filter((t) => t.status !== 'completed');
    const delayActive = getTasksByQuadrant('delay').filter((t) => t.status !== 'completed');

    if (doActive.length > 2) {
      warnings.push({
        id: 'q1-overflow',
        message: `Do quadrant has ${doActive.length} items — consider moving ${doActive.length - 2} elsewhere.`,
      });
    }

    if (delayActive.length > 0) {
      const hasStrategic = delayActive.some((t) => t.metadata?.timeHorizon === 'strategic');
      const hasExploration = delayActive.some((t) => t.metadata?.timeHorizon === 'exploration');
      if (!hasStrategic || !hasExploration) {
        const missing = [];
        if (!hasStrategic) missing.push('Strategic');
        if (!hasExploration) missing.push('Exploration');
        warnings.push({
          id: 'q2-composition',
          message: `Delay quadrant is missing ${missing.join(' and ')} work — protect your Q2.`,
        });
      }
    }

    return warnings;
  }, [getTasksByQuadrant]);

  const scheduleTask = useCallback(async (taskId, { due, quadrant, delegatedTo }) => {
    return updateTask(taskId, { due, quadrant, delegatedTo });
  }, [updateTask]);

  const splitTask = useCallback(async (sourceTask, childTitles) => {
    const titles = childTitles.map((t) => t.trim()).filter(Boolean);
    if (titles.length === 0) return [];

    const created = [];
    for (const title of titles) {
      const notes = `Split from: ${sourceTask.cleanTitle || sourceTask.title}`;
      const child = await createTask({
        title,
        notes,
        timeHorizon: 'tactical',
        categoryListId: sourceTask.listId,
      });
      if (child) created.push(child);
    }
    return created;
  }, [createTask]);

  // Create a category (new task list)
  const createCategory = useCallback(async (name) => {
    if (!accessToken) return;
    
    try {
      const newList = await withAuthRetry((token) => taskListsApi.create(token, name));
      dispatch({ type: ACTIONS.ADD_TASK_LIST, payload: newList });
      return newList;
    } catch (error) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, [accessToken, withAuthRetry]);

  // Accept a delegated task: create in Google Tasks (DO), then PATCH accept with task ids
  const acceptDelegation = useCallback(async (delegation) => {
    if (!accessToken || !state.primaryListId) return;
    const payload = delegation.taskPayload || {};
    const title = titlePrefix.create(payload.title || 'Untitled', 'do');
    const notes = addDelegationIdToNotes(payload.notes || '', delegation.id);
    const taskPayload = { title, notes, due: payload.due || null, status: 'needsAction' };
    const created = await withAuthRetry((token) =>
      tasksApi.create(token, state.primaryListId, taskPayload)
    );
    await withAuthRetry((token) =>
      delegationsApi.accept(token, delegation.id, {
        assigneeTaskId: created.id,
        assigneeListId: state.primaryListId,
      }, userEmail)
    );
    const enrichedTask = enrichTask(created, { id: state.primaryListId, title: getListTitle(state.primaryListId) });
    dispatch({ type: ACTIONS.ADD_TASK, payload: enrichedTask });
  }, [accessToken, state.primaryListId, withAuthRetry, getListTitle, userEmail]);

  // Decline a delegated task
  const declineDelegation = useCallback(async (delegationId) => {
    if (!accessToken) return;
    await withAuthRetry((token) => delegationsApi.decline(token, delegationId, userEmail));
  }, [accessToken, withAuthRetry, userEmail]);

  // Fetch delegation inbox with token refresh (so expired tokens are retried)
  const getDelegationInbox = useCallback(async () => {
    if (!accessToken) return [];
    return withAuthRetry((token) => delegationsApi.getInbox(token, userEmail));
  }, [accessToken, withAuthRetry, userEmail]);

  // Create delegation (for Layout) with token refresh
  const createDelegation = useCallback(async (payload) => {
    if (!accessToken) return;
    return withAuthRetry((token) => delegationsApi.create(token, payload, userEmail));
  }, [accessToken, withAuthRetry, userEmail]);

  const value = {
    ...state,
    fetchTasks,
    createTask,
    updateTask,
    moveTask,
    deleteTask,
    toggleComplete,
    toggleShowCompleted,
    getTasksByQuadrant,
    getBacklogTasksByHorizon,
    getGuardrailWarnings,
    scheduleTask,
    splitTask,
    createCategory,
    changeTaskCategory,
    getListTitle,
    acceptDelegation,
    declineDelegation,
    getDelegationInbox,
    createDelegation,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasks() {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
}
