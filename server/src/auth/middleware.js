import { verifyAccessToken } from './tokens.js';

// Verify the `Authorization: Bearer <token>` access token and attach req.userId.
// Responds 401 on a missing, malformed, expired, or otherwise invalid token.
export function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header.' });
  }

  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}
