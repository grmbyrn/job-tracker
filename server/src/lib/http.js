import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

// Operational error with an HTTP status — thrown from route handlers and turned
// into a clean JSON response by the centralized errorHandler below.
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

// Wrap an async route handler so a rejected promise reaches errorHandler via
// next() instead of crashing the process (Express 5 forwards sync throws, but
// not async rejections).
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// 404 for any unmatched route — mounted after all routers.
export function notFound(req, res) {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
}

// Single place that turns errors into responses. Order matters: known shapes
// first, then a generic 500 that doesn't leak internals.
// eslint-disable-next-line no-unused-vars -- Express needs the 4-arg signature
export function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation failed.', issues: formatZodIssues(err) });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Record not found (e.g. update/delete of a non-existent id).
    if (err.code === 'P2025') return res.status(404).json({ error: 'Resource not found.' });
    // Foreign-key violation — e.g. linking a contact to a company that isn't yours.
    if (err.code === 'P2003') return res.status(400).json({ error: 'Invalid reference.' });
  }

  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
}

// Flatten zod issues to `{ field: message }` for friendly client errors.
export function formatZodIssues(err) {
  return err.issues.map((i) => ({ field: i.path.join('.') || '(root)', message: i.message }));
}
