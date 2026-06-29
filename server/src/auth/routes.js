import { Router } from 'express';
import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from './tokens.js';

const BCRYPT_COST = 12;
const REFRESH_COOKIE = 'refreshToken';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

// Public shape of a user — never expose passwordHash.
const userView = (user) => ({ id: user.id, email: user.email, createdAt: user.createdAt });

// httpOnly so client JS can't read it; SameSite=Lax + Secure in prod; scoped to
// the refresh endpoint so it isn't sent on every request. 7d to match the token.
const refreshCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

// Validate + normalize the credentials body. Returns { email, password } or null.
function readCredentials(body) {
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!EMAIL_RE.test(email)) return null;
  if (password.length < MIN_PASSWORD_LENGTH) return null;
  return { email, password };
}

function issueSession(res, userId) {
  res.cookie(REFRESH_COOKIE, signRefreshToken(userId), refreshCookieOptions());
  return signAccessToken(userId);
}

export const authRouter = Router();

authRouter.post('/register', async (req, res, next) => {
  const creds = readCredentials(req.body);
  if (!creds) {
    return res.status(400).json({
      error: `Provide a valid email and a password of at least ${MIN_PASSWORD_LENGTH} characters.`,
    });
  }

  try {
    const passwordHash = await bcrypt.hash(creds.password, BCRYPT_COST);
    const user = await prisma.user.create({
      data: { email: creds.email, passwordHash },
    });
    const accessToken = issueSession(res, user.id);
    res.status(201).json({ accessToken, user: userView(user) });
  } catch (err) {
    // Unique-constraint violation on email → 409, without leaking other detail.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  const creds = readCredentials(req.body);
  // Generic message: don't reveal whether it was the email or the password.
  const reject = () => res.status(401).json({ error: 'Invalid email or password.' });
  if (!creds) return reject();

  try {
    const user = await prisma.user.findUnique({ where: { email: creds.email } });
    if (!user) {
      // Compare against a throwaway hash so timing doesn't betray unknown emails.
      await bcrypt.compare(
        creds.password,
        '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv',
      );
      return reject();
    }
    const ok = await bcrypt.compare(creds.password, user.passwordHash);
    if (!ok) return reject();

    const accessToken = issueSession(res, user.id);
    res.json({ accessToken, user: userView(user) });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/refresh', (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) {
    return res.status(401).json({ error: 'Missing refresh token.' });
  }
  try {
    const payload = verifyRefreshToken(token);
    res.json({ accessToken: signAccessToken(payload.sub) });
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }
});

authRouter.post('/logout', (req, res) => {
  // clearCookie must mirror the path the cookie was set with.
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  res.status(204).end();
});
