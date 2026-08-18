/**
 * Attaches user email to req.userEmail for delegation routes.
 * Uses X-User-Email from the request (frontend sends email from auth/localStorage).
 * Also requires Authorization: Bearer <token> so the client must be "logged in".
 * Note: We do not verify the token with Google; email is trusted from the client (tradeoff for simplicity).
 */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const email = req.headers['x-user-email'];
  const trimmed = typeof email === 'string' ? email.trim() : '';
  if (!trimmed || !trimmed.includes('@')) {
    return res.status(401).json({ error: 'Missing or invalid X-User-Email header' });
  }
  req.userEmail = trimmed.toLowerCase();
  next();
}
