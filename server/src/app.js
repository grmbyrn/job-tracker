import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { prisma } from './db.js';
import { authRouter } from './auth/routes.js';
import { requireAuth } from './auth/middleware.js';
import { companiesRouter } from './routes/companies.js';
import { contactsRouter } from './routes/contacts.js';
import { activitiesRouter } from './routes/activities.js';
import { applicationsRouter } from './routes/applications.js';
import { settingsRouter } from './routes/settings.js';
import { importRouter } from './routes/import.js';
import { notFound, errorHandler } from './lib/http.js';

// Builds the Express app without binding a port, so tests (Supertest) can import
// it directly and index.js owns process concerns (listen, env loading).
export function createApp() {
  const app = express();

  // Secure HTTP headers. Behind a proxy/CDN in prod, so trust the first hop for
  // correct client IPs (rate limiting) and Secure-cookie handling.
  app.set('trust proxy', 1);
  app.use(helmet());

  // Allowlist of browser origins permitted to send the httpOnly refresh cookie
  // (comma-separated CLIENT_ORIGIN). Credentials mode forbids a wildcard, so each
  // origin is checked explicitly; non-browser clients (curl, mobile) send no
  // Origin header and are allowed through.
  const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`Origin ${origin} is not allowed by CORS.`));
      },
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());

  app.get('/api/health', (req, res) => {
    res.json({ ok: true });
  });

  // Throttle auth endpoints to blunt credential stuffing / brute force. Skipped
  // under test so the suite's many register/login calls from one IP don't trip it.
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many attempts. Please try again later.' },
    skip: () => process.env.NODE_ENV === 'test',
  });

  app.use('/api/auth', authLimiter, authRouter);

  // Protected: proves the access token → req.userId flow end to end.
  app.get('/api/me', requireAuth, async (req, res, next) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { id: true, email: true, createdAt: true },
      });
      if (!user) return res.status(404).json({ error: 'User not found.' });
      res.json({ user });
    } catch (err) {
      next(err);
    }
  });

  // Core REST API (Phase 3) — every router is user-scoped behind requireAuth.
  app.use('/api/companies', requireAuth, companiesRouter);
  app.use('/api/contacts', requireAuth, contactsRouter);
  app.use('/api/activities', requireAuth, activitiesRouter);
  app.use('/api/applications', requireAuth, applicationsRouter);
  app.use('/api/settings', requireAuth, settingsRouter);

  // Prototype data migration (Phase 4) — restore an "Export backup" JSON.
  app.use('/api/import', requireAuth, importRouter);

  // 404 for unmatched routes, then the centralized error handler (must be last).
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
