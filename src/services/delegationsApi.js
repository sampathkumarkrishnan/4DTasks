const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function getBase() {
  if (!API_BASE) {
    console.warn('VITE_API_URL is not set; delegation API calls will fail.');
  }
  return API_BASE;
}

async function request(accessToken, path, options = {}) {
  const { userEmail, ...restOptions } = options;
  const url = `${getBase()}${path}`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    ...(userEmail && { 'X-User-Email': userEmail }),
    ...restOptions.headers,
  };
  const res = await fetch(url, {
    ...restOptions,
    headers,
  });
  const text = await res.text();
  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = JSON.parse(text);
      message = data.error || message;
    } catch (_) {}
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return text ? JSON.parse(text) : null;
}

export const delegationsApi = {
  /** Used when moving a task to Delegate: Layout.handleMoveConfirm → TaskContext.createDelegation → this */
  create(accessToken, { taskPayload, toEmail, sourceListId, sourceTaskId, sourceDelegationId }, userEmail) {
    return request(accessToken, '/api/delegations', {
      method: 'POST',
      body: JSON.stringify({
        taskPayload,
        toEmail,
        sourceListId,
        sourceTaskId,
        ...(sourceDelegationId && { sourceDelegationId }),
      }),
      userEmail,
    });
  },

  getInbox(accessToken, userEmail) {
    return request(accessToken, '/api/delegations', { userEmail });
  },

  getSent(accessToken, userEmail) {
    return request(accessToken, '/api/delegations/sent', { userEmail });
  },

  accept(accessToken, delegationId, { assigneeTaskId, assigneeListId }, userEmail) {
    return request(accessToken, `/api/delegations/${delegationId}/accept`, {
      method: 'PATCH',
      body: JSON.stringify({ assigneeTaskId, assigneeListId }),
      userEmail,
    });
  },

  complete(accessToken, delegationId, userEmail) {
    return request(accessToken, `/api/delegations/${delegationId}/complete`, {
      method: 'PATCH',
      userEmail,
    });
  },

  decline(accessToken, delegationId, userEmail) {
    return request(accessToken, `/api/delegations/${delegationId}/decline`, {
      method: 'PATCH',
      userEmail,
    });
  },
};

/** Parse delegation id from task notes (format: [4DTasks:delegationId=uuid]) */
export function getDelegationIdFromNotes(notes) {
  if (!notes || typeof notes !== 'string') return null;
  const m = notes.match(/\[4DTasks:delegationId=([^\]]+)\]/);
  return m ? m[1].trim() : null;
}

/** Append delegation id marker to notes so we can call complete later */
export function addDelegationIdToNotes(notes, delegationId) {
  const base = (notes || '').trim();
  const suffix = `\n[4DTasks:delegationId=${delegationId}]`;
  return base ? base + suffix : suffix.trim();
}
