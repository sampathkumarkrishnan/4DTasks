const TASKS_API_BASE = 'https://tasks.googleapis.com/tasks/v1';

// Custom error class for authentication errors
export class AuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthenticationError';
    this.status = 401;
  }
}

// Helper to make authenticated requests
async function apiRequest(endpoint, accessToken, options = {}) {
  const response = await fetch(`${TASKS_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    
    // Throw specific error for 401 Unauthorized
    if (response.status === 401) {
      throw new AuthenticationError(error.error?.message || 'Authentication failed');
    }
    
    throw new Error(error.error?.message || `API request failed: ${response.status}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// Task Lists (Categories) API
export const taskListsApi = {
  // Get all task lists
  async getAll(accessToken) {
    const data = await apiRequest('/users/@me/lists', accessToken);
    return data.items || [];
  },

  // Create a new task list
  async create(accessToken, title) {
    return apiRequest('/users/@me/lists', accessToken, {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  },

  // Update a task list
  async update(accessToken, listId, title) {
    return apiRequest(`/users/@me/lists/${listId}`, accessToken, {
      method: 'PUT',
      body: JSON.stringify({ title }),
    });
  },

  // Delete a task list
  async delete(accessToken, listId) {
    return apiRequest(`/users/@me/lists/${listId}`, accessToken, {
      method: 'DELETE',
    });
  },
};

// Tasks API
export const tasksApi = {
  // Get all tasks from a list
  async getAll(accessToken, listId, showCompleted = true, showHidden = false) {
    const params = new URLSearchParams({
      showCompleted: showCompleted.toString(),
      showHidden: showHidden.toString(),
      maxResults: '100',
    });
    const data = await apiRequest(`/lists/${listId}/tasks?${params}`, accessToken);
    return data.items || [];
  },

  // Get a single task
  async get(accessToken, listId, taskId) {
    return apiRequest(`/lists/${listId}/tasks/${taskId}`, accessToken);
  },

  // Create a new task
  async create(accessToken, listId, task) {
    return apiRequest(`/lists/${listId}/tasks`, accessToken, {
      method: 'POST',
      body: JSON.stringify(task),
    });
  },

  // Update a task
  async update(accessToken, listId, taskId, updates) {
    return apiRequest(`/lists/${listId}/tasks/${taskId}`, accessToken, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  // Delete a task
  async delete(accessToken, listId, taskId) {
    return apiRequest(`/lists/${listId}/tasks/${taskId}`, accessToken, {
      method: 'DELETE',
    });
  },

  // Move a task to a different list
  async move(accessToken, fromListId, toListId, task) {
    // Google Tasks API doesn't support moving between lists directly
    // We need to create in new list and delete from old list
    if (!task || !task.title) {
      throw new Error('Task or task title is missing');
    }
    const newTask = await this.create(accessToken, toListId, {
      title: task.title,
      notes: task.notes || '',
      due: task.due || null,
      status: task.status || 'needsAction',
    });
    await this.delete(accessToken, fromListId, task.id);
    return newTask;
  },

  // Mark task as completed
  async complete(accessToken, listId, taskId) {
    return this.update(accessToken, listId, taskId, {
      status: 'completed',
    });
  },

  // Mark task as not completed
  async uncomplete(accessToken, listId, taskId) {
    return this.update(accessToken, listId, taskId, {
      status: 'needsAction',
    });
  },
};

// Title prefix utilities for storing quadrant/assignee info in task title
// Format: [QUADRANT] or [DELEGATE:email] at the start of title
// Backlog tasks have no prefix until promoted to the execution set
export const titlePrefix = {
  // Quadrant labels for prefixes
  QUADRANTS: {
    do: 'DO',
    delegate: 'DELEGATE',
    delay: 'DELAY',
    delete: 'DELETE',
  },

  // Create a prefixed title (no prefix when quadrant is null — backlog tasks)
  create(cleanTitle, quadrant = null, delegatedTo = null) {
    const title = cleanTitle || 'Untitled';
    if (!quadrant) return title;

    const quadrantLabel = this.QUADRANTS[quadrant] || 'DO';
    
    if (quadrant === 'delegate' && delegatedTo) {
      return `[${quadrantLabel}:${delegatedTo}] ${title}`;
    }
    
    return `[${quadrantLabel}] ${title}`;
  },

  // Parse a title to extract quadrant, delegatedTo, and clean title
  parse(title) {
    if (!title) {
      return { quadrant: null, delegatedTo: null, cleanTitle: '' };
    }

    // Match patterns like [DO], [DELEGATE:email@example.com], etc.
    const prefixMatch = title.match(/^\[(DO|DELEGATE|DELAY|DELETE)(?::([^\]]+))?\]\s*/i);
    
    if (prefixMatch) {
      const quadrantLabel = prefixMatch[1].toUpperCase();
      const delegatedTo = prefixMatch[2] || null;
      const cleanTitle = title.slice(prefixMatch[0].length);
      
      // Map label back to quadrant key
      const quadrant = Object.entries(this.QUADRANTS)
        .find(([, label]) => label === quadrantLabel)?.[0] || 'do';
      
      return { quadrant, delegatedTo, cleanTitle };
    }

    // No prefix — backlog task
    return { quadrant: null, delegatedTo: null, cleanTitle: title };
  },

  // Check if a title has our prefix format
  hasPrefix(title) {
    if (!title) return false;
    return /^\[(DO|DELEGATE|DELAY|DELETE)(?::[^\]]+)?\]/i.test(title);
  },

  // Update prefix on an existing title (pass null quadrant to strip)
  update(title, quadrant, delegatedTo = null) {
    const { cleanTitle } = this.parse(title);
    return this.create(cleanTitle, quadrant, delegatedTo);
  },
};

const META_MARKER = '\n---EISENHOWER_META---\n';
const META_BLOCK_REGEX = /(?:^|\n)---EISENHOWER_META---\n[\s\S]*$/;
const DEFAULT_TIME_HORIZON = 'adhoc';

// Metadata stored in notes (time horizon + legacy fields)
export const taskMetadata = {
  parse(notes) {
    if (!notes) return {};
    try {
      const metaMatch = notes.match(/(?:^|\n)---EISENHOWER_META---\n(.+)$/s);
      if (metaMatch) {
        return JSON.parse(metaMatch[1]);
      }
      return {};
    } catch {
      return {};
    }
  },

  getDisplayNotes(notes) {
    if (!notes) return '';
    return notes.replace(META_BLOCK_REGEX, '').trim();
  },

  serialize(displayNotes, meta = {}) {
    const payload = {};
    const timeHorizon = meta.timeHorizon;

    // Default horizon needs no storage — enrichTask falls back to adhoc on read
    if (timeHorizon && timeHorizon !== DEFAULT_TIME_HORIZON) {
      payload.timeHorizon = timeHorizon;
    }
    if (meta.quadrant) payload.quadrant = meta.quadrant;
    if (meta.delegatedTo) payload.delegatedTo = meta.delegatedTo;

    const clean = (displayNotes || '').trim();
    const hasMeta = Object.keys(payload).length > 0;

    if (!clean && !hasMeta) return '';

    const metaBlock = `${META_MARKER}${JSON.stringify(payload)}`;
    return clean ? `${clean}${metaBlock}` : `---EISENHOWER_META---\n${JSON.stringify(payload)}`;
  },

  META_MARKER,
};

// Factory to create an auth retry wrapper for API calls
// This wrapper catches 401 errors, attempts silent token refresh, and retries the operation
export function createAuthRetryWrapper(refreshTokenAsync, getToken) {
  return async function withAuthRetry(apiCallFactory) {
    try {
      // First attempt with current token
      return await apiCallFactory(getToken());
    } catch (error) {
      const isAuthError = error instanceof AuthenticationError || (error && error.status === 401);
      if (isAuthError) {
        // Token expired or invalid (Google or our backend 401) - attempt silent refresh
        try {
          const newToken = await refreshTokenAsync();
          // Retry the operation with the new token
          return await apiCallFactory(newToken);
        } catch (refreshError) {
          // Silent refresh failed - re-throw the original auth error
          // This will trigger the manual re-auth flow
          console.log('Silent token refresh failed:', refreshError.message);
          throw error;
        }
      }
      // Non-auth errors pass through unchanged
      throw error;
    }
  };
}

export default {
  taskLists: taskListsApi,
  tasks: tasksApi,
  metadata: taskMetadata,
  titlePrefix,
  createAuthRetryWrapper,
};

