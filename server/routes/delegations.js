import { Router } from 'express';
import { randomUUID } from 'crypto';
import { getDb } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

export const delegationsRouter = Router();
delegationsRouter.use(requireAuth);

const normalizeEmail = (e) => (e && typeof e === 'string' ? e.trim().toLowerCase() : '');

/** Collect all delegator emails in the chain (current + ancestors), lowercased for comparison. */
function getChainEmails(database, parentDelegationId, currentEmail) {
  const set = new Set([normalizeEmail(currentEmail)]);
  let id = parentDelegationId;
  while (id) {
    const row = database.prepare('SELECT fromUserEmail, parentDelegationId FROM delegations WHERE id = ?').get(id);
    if (!row) break;
    set.add(normalizeEmail(row.fromUserEmail));
    id = row.parentDelegationId;
  }
  return set;
}

/** Mark this delegation and all ancestors as completed. */
function cascadeComplete(database, delegationId) {
  const now = new Date().toISOString();
  let id = delegationId;
  while (id) {
    database.prepare(
      "UPDATE delegations SET status = 'completed', completedAt = ? WHERE id = ?"
    ).run(now, id);
    const row = database.prepare('SELECT parentDelegationId FROM delegations WHERE id = ?').get(id);
    id = row ? row.parentDelegationId : null;
  }
}

// POST /api/delegations
delegationsRouter.post('/', (req, res) => {
  const { taskPayload, toEmail, sourceListId, sourceTaskId, sourceDelegationId } = req.body;
  const fromUserEmail = req.userEmail;
  if (!taskPayload || !toEmail || !sourceListId || !sourceTaskId) {
    return res.status(400).json({
      error: 'Missing required fields: taskPayload, toEmail, sourceListId, sourceTaskId',
    });
  }
  const toEmailNorm = normalizeEmail(toEmail);
  const fromEmailNorm = normalizeEmail(fromUserEmail);
  const db = getDb();
  const parentDelegationId = sourceDelegationId || null;
  if (parentDelegationId) {
    const chainEmails = getChainEmails(db, parentDelegationId, fromUserEmail);
    if (chainEmails.has(toEmailNorm)) {
      return res.status(400).json({
        error: 'Cannot delegate to someone upstream; this would create a cycle',
      });
    }
  } else {
    if (fromEmailNorm === toEmailNorm) {
      return res.status(400).json({ error: 'Cannot delegate to yourself' });
    }
  }
  const id = randomUUID();
  const taskPayloadStr = typeof taskPayload === 'string' ? taskPayload : JSON.stringify(taskPayload);
  db.prepare(
    `INSERT INTO delegations (id, fromUserEmail, toEmail, taskPayload, status, sourceListId, sourceTaskId, parentDelegationId)
     VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)`
  ).run(id, fromUserEmail, toEmailNorm, taskPayloadStr, sourceListId, sourceTaskId, parentDelegationId);
  res.status(201).json({ delegationId: id });
});

// GET /api/delegations/sent (must be before / to avoid being captured by :id in future)
delegationsRouter.get('/sent', (req, res) => {
  const fromUserEmail = req.userEmail;
  const db = getDb();
  const rows = db.prepare(
    `SELECT id, fromUserEmail, toEmail, taskPayload, status, sourceListId, sourceTaskId,
            parentDelegationId, assigneeTaskId, assigneeListId, createdAt, acceptedAt, completedAt, declinedAt
     FROM delegations WHERE fromUserEmail = ? ORDER BY createdAt DESC`
  ).all(fromUserEmail);
  const list = rows.map((r) => ({
    id: r.id,
    fromUserEmail: r.fromUserEmail,
    toEmail: r.toEmail,
    taskPayload: parsePayload(r.taskPayload),
    status: r.status,
    sourceListId: r.sourceListId,
    sourceTaskId: r.sourceTaskId,
    parentDelegationId: r.parentDelegationId,
    assigneeTaskId: r.assigneeTaskId,
    assigneeListId: r.assigneeListId,
    createdAt: r.createdAt,
    acceptedAt: r.acceptedAt,
    completedAt: r.completedAt,
    declinedAt: r.declinedAt,
  }));
  res.json(list);
});

// GET /api/delegations (inbox: pending for current user; match email case-insensitively)
delegationsRouter.get('/', (req, res) => {
  const currentEmail = normalizeEmail(req.userEmail);
  const db = getDb();
  const rows = db.prepare(
    `SELECT id, fromUserEmail, toEmail, taskPayload, status, sourceListId, sourceTaskId,
            parentDelegationId, assigneeTaskId, assigneeListId, createdAt, acceptedAt, completedAt, declinedAt
     FROM delegations WHERE LOWER(TRIM(toEmail)) = ? AND status = 'pending' ORDER BY createdAt DESC`
  ).all(currentEmail);
  const list = rows.map((r) => ({
    id: r.id,
    fromUserEmail: r.fromUserEmail,
    toEmail: r.toEmail,
    taskPayload: parsePayload(r.taskPayload),
    status: r.status,
    sourceListId: r.sourceListId,
    sourceTaskId: r.sourceTaskId,
    parentDelegationId: r.parentDelegationId,
    assigneeTaskId: r.assigneeTaskId,
    assigneeListId: r.assigneeListId,
    createdAt: r.createdAt,
    acceptedAt: r.acceptedAt,
    completedAt: r.completedAt,
    declinedAt: r.declinedAt,
  }));
  res.json(list);
});

// PATCH /api/delegations/:id/accept
delegationsRouter.patch('/:id/accept', (req, res) => {
  const { id } = req.params;
  const assigneeEmail = req.userEmail;
  const { assigneeTaskId, assigneeListId } = req.body || {};
  const db = getDb();
  const row = db.prepare('SELECT id, toEmail, status FROM delegations WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Delegation not found' });
  if (normalizeEmail(row.toEmail) !== normalizeEmail(assigneeEmail)) return res.status(403).json({ error: 'Not the assignee' });
  if (row.status !== 'pending') return res.status(400).json({ error: 'Delegation already accepted or declined' });
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE delegations SET status = 'accepted', acceptedAt = ?, assigneeTaskId = ?, assigneeListId = ? WHERE id = ?`
  ).run(now, assigneeTaskId ?? null, assigneeListId ?? null, id);
  res.json({ ok: true });
});

// PATCH /api/delegations/:id/complete
delegationsRouter.patch('/:id/complete', (req, res) => {
  const { id } = req.params;
  const assigneeEmail = req.userEmail;
  const db = getDb();
  const row = db.prepare('SELECT id, toEmail, status FROM delegations WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Delegation not found' });
  if (normalizeEmail(row.toEmail) !== normalizeEmail(assigneeEmail)) return res.status(403).json({ error: 'Not the assignee' });
  cascadeComplete(db, id);
  res.json({ ok: true });
});

// PATCH /api/delegations/:id/decline
delegationsRouter.patch('/:id/decline', (req, res) => {
  const { id } = req.params;
  const assigneeEmail = req.userEmail;
  const db = getDb();
  const row = db.prepare('SELECT id, toEmail, status FROM delegations WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Delegation not found' });
  if (normalizeEmail(row.toEmail) !== normalizeEmail(assigneeEmail)) return res.status(403).json({ error: 'Not the assignee' });
  if (row.status !== 'pending') return res.status(400).json({ error: 'Delegation already accepted or declined' });
  const now = new Date().toISOString();
  db.prepare("UPDATE delegations SET status = 'declined', declinedAt = ? WHERE id = ?").run(now, id);
  res.json({ ok: true });
});

function parsePayload(str) {
  if (typeof str !== 'string') return str;
  try {
    return JSON.parse(str);
  } catch {
    return { title: str };
  }
}
