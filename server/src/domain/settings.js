// Per-user follow-up timer settings (Phase 6). Timers are stored as JSON on the
// User (`followupTimers`) and merged over DEFAULT_TIMERS on read, so a user only
// overrides what they've changed and new fields default sensibly.
import { prisma } from '../db.js';
import { DEFAULT_TIMERS } from './followup.js';

// Merge a user's stored timers over the defaults. `stored` is JSON (or null).
export function mergeTimers(stored) {
  const overrides = stored && typeof stored === 'object' ? stored : {};
  return { ...DEFAULT_TIMERS, ...overrides };
}

// Load the effective (merged) follow-up timers for a user — the value the
// countdown/due helpers should run against.
export async function loadTimers(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { followupTimers: true },
  });
  return mergeTimers(user?.followupTimers);
}
