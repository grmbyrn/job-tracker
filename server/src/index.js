import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
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

const app = express();
const PORT = process.env.PORT || 3000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// credentials + explicit origin so the httpOnly refresh cookie round-trips
// from the Vite client (wildcard origins can't be used with credentials).
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRouter);

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

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
