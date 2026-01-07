import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { taskListsApi, tasksApi, taskMetadata, titlePrefix, AuthenticationError } from '../services/googleTasksApi';

const TaskContext = createContext(null);

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
};

const initialState = {
  taskLists: [],       // Google Task Lists (categories)
  primaryListId: null, // The user's primary/first list
  tasks: [],           // All tasks from all lists
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
    
    default:
      return state;
  }
}

export function TaskProvider({ children }) {
  const { accessToken, isAuthenticated, refreshToken } = useAuth();
  const [state, dispatch] = useReducer(taskReducer, initialState);
  
  // Track if we're currently attempting a token refresh to avoid loops
  const isRefreshingRef = useRef(false);

  // Fetch all task lists (categories)
  const fetchTaskLists = useCallback(async () => {
    if (!accessToken) return [];
    
    try {
      const lists = await taskListsApi.getAll(accessToken);
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
  }, [accessToken]);

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
          const tasks = await tasksApi.getAll(accessToken, list.id, true, true);
          // Enrich each task with list info and parsed metadata
          return tasks.map((task) => {
            // Parse title prefix (new format)
            const { quadrant, delegatedTo, cleanTitle } = titlePrefix.parse(task.title);
            
            // Also check legacy metadata for backward compatibility
            const legacyMeta = taskMetadata.parse(task.notes);
            
            // Prefer title prefix data, fall back to legacy metadata
            const metadata = {
              quadrant: titlePrefix.hasPrefix(task.title) ? quadrant : (legacyMeta.quadrant || 'do'),
              delegatedTo: titlePrefix.hasPrefix(task.title) ? delegatedTo : (legacyMeta.delegatedTo || null),
            };
            
            return {
              ...task,
              listId: list.id,
              listTitle: list.title,
              metadata,
              cleanTitle, // The title without prefix for display
              displayNotes: taskMetadata.getDisplayNotes(task.notes),
            };
          });
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
      const allTasks = tasksArrays.flat();
      
      dispatch({ type: ACTIONS.SET_TASKS, payload: allTasks });
    } catch (error) {
      // Handle 401 authentication errors by triggering token refresh
      if (error instanceof AuthenticationError && !isRefreshingRef.current) {
        console.log('Authentication error detected, triggering token refresh');
        isRefreshingRef.current = true;
        refreshToken();
        // The app will re-fetch tasks when the new token is available
        setTimeout(() => {
          isRefreshingRef.current = false;
        }, 5000);
        return;
      }
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
    }
  }, [accessToken, fetchTaskLists, refreshToken]);

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
    
    // Determine which list to create the task in
    const targetListId = getListIdForCategory(taskData.categoryListId);
    if (!targetListId) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: 'No task list available' });
      return;
    }
    
    const quadrant = taskData.quadrant || 'do';
    const delegatedTo = taskData.delegatedTo || null;
    
    // Create prefixed title for Google Tasks visibility
    const prefixedTitle = titlePrefix.create(taskData.title, quadrant, delegatedTo);
    
    const taskPayload = {
      title: prefixedTitle,
      notes: taskData.notes || '', // Notes are now just notes, no hidden metadata
      due: taskData.due || null,
      status: 'needsAction',
    };
    
    try {
      const newTask = await tasksApi.create(accessToken, targetListId, taskPayload);
      
      const enrichedTask = {
        ...newTask,
        listId: targetListId,
        listTitle: getListTitle(targetListId),
        metadata: { quadrant, delegatedTo },
        cleanTitle: taskData.title, // Store the clean title for display
        displayNotes: taskData.notes || '',
      };
      
      dispatch({ type: ACTIONS.ADD_TASK, payload: enrichedTask });
      return enrichedTask;
    } catch (error) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, [accessToken, getListIdForCategory, getListTitle]);

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
    
    // Build new metadata
    const newMetadata = {
      quadrant: updates.quadrant !== undefined ? updates.quadrant : task.metadata?.quadrant || 'do',
      delegatedTo: updates.delegatedTo !== undefined ? updates.delegatedTo : task.metadata?.delegatedTo || null,
    };
    
    // Determine the clean title (without prefix)
    // Handle case where task.title might be undefined
    const existingCleanTitle = task.cleanTitle || (task.title ? titlePrefix.parse(task.title).cleanTitle : '');
    const cleanTitle = updates.title !== undefined ? updates.title : existingCleanTitle;
    
    // Create the new prefixed title
    const prefixedTitle = titlePrefix.create(cleanTitle, newMetadata.quadrant, newMetadata.delegatedTo);
    
    // Build task payload - only include fields that have values
    const taskPayload = {
      title: prefixedTitle,
    };
    
    // Only include optional fields if they have values
    if (updates.due !== undefined) {
      taskPayload.due = updates.due;
    }
    if (updates.status !== undefined) {
      taskPayload.status = updates.status;
    }
    
    // Handle notes - only include if we have a value
    const notesValue = updates.notes !== undefined ? updates.notes : (task.displayNotes || '');
    if (notesValue) {
      taskPayload.notes = notesValue;
    }
    
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
          ...(updates.status !== undefined && { status: updates.status }),
          displayNotes: notesValue,
        },
      });
      
      await tasksApi.update(accessToken, task.listId, taskId, taskPayload);
    } catch (error) {
      console.error('Failed to update task:', error, { taskId, listId: task.listId, taskPayload });
      // Revert on error
      dispatch({ type: ACTIONS.UPDATE_TASK, payload: task });
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, [accessToken, state.tasks]);

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
      const newTask = await tasksApi.move(accessToken, task.listId, targetListId, {
        id: task.id,
        title: taskTitle,
        notes: task.notes,
        due: task.due,
        status: task.status,
      });
      
      // Remove old task from state
      dispatch({ type: ACTIONS.REMOVE_TASK, payload: taskId });
      
      // Parse the title to get metadata
      const { quadrant, delegatedTo, cleanTitle } = titlePrefix.parse(newTask.title);
      
      // Add new task to state
      const enrichedTask = {
        ...newTask,
        listId: targetListId,
        listTitle: getListTitle(targetListId),
        metadata: { quadrant, delegatedTo },
        cleanTitle,
        displayNotes: taskMetadata.getDisplayNotes(newTask.notes),
      };
      
      dispatch({ type: ACTIONS.ADD_TASK, payload: enrichedTask });
      return enrichedTask;
    } catch (error) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, [accessToken, state.tasks, state.primaryListId, getListTitle]);

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
      
      await tasksApi.delete(accessToken, listId, taskId);
    } catch (error) {
      console.error('Failed to delete task:', error, { taskId, listId });
      // Revert on error
      dispatch({ type: ACTIONS.ADD_TASK, payload: taskForRevert });
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, [accessToken, state.tasks]);

  // Toggle task completion
  const toggleComplete = useCallback(async (taskId) => {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;
    
    const newStatus = task.status === 'completed' ? 'needsAction' : 'completed';
    return updateTask(taskId, { status: newStatus });
  }, [state.tasks, updateTask]);

  // Toggle show completed for a quadrant
  const toggleShowCompleted = useCallback((quadrant) => {
    dispatch({
      type: ACTIONS.SET_SHOW_COMPLETED,
      payload: { quadrant, show: !state.showCompleted[quadrant] },
    });
  }, [state.showCompleted]);

  // Get tasks by quadrant
  const getTasksByQuadrant = useCallback((quadrant) => {
    return state.tasks.filter((task) => {
      const taskQuadrant = task.metadata?.quadrant || 'do';
      const isCompleted = task.status === 'completed';
      
      if (taskQuadrant !== quadrant) return false;
      if (isCompleted && !state.showCompleted[quadrant]) return false;
      
      return true;
    });
  }, [state.tasks, state.showCompleted]);

  // Create a category (new task list)
  const createCategory = useCallback(async (name) => {
    if (!accessToken) return;
    
    try {
      const newList = await taskListsApi.create(accessToken, name);
      dispatch({ type: ACTIONS.ADD_TASK_LIST, payload: newList });
      return newList;
    } catch (error) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, [accessToken]);

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
    createCategory,
    changeTaskCategory,
    getListTitle,
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
