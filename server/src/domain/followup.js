// Follow-up business logic, ported from the prototype (root index.html).
// Pure functions over Prisma `Contact` records so they can be reused by the
// API (Phase 3), the frontend countdown pills (Phase 6), and the reminder
// cron (Phase 7). Helpers take an optional `timers` arg so per-user settings
// can replace the defaults later without changing call sites.

// Days, per lane, to wait before a contact needs chasing; `max` caps follow-ups.
export const DEFAULT_TIMERS = { Agency: 7, Company: 7, Freelance: 7, Warm: 7, max: 2 };

// Once a connection is accepted and a message sent (`contacted`), chase after 7d.
export const MSG_FOLLOWUP = 7;

// "3 people contacted" goal per target company.
export const TARGET_GOAL = 3;

// Stages that count as active outreach awaiting a reply (the only ones that can
// become "due"). Mirrors the prototype's `status === 'sent' || 'contacted'`.
const DUE_STAGES = new Set(['sent', 'contacted']);

const MS_PER_DAY = 86_400_000;

// The timestamp the countdown runs from: last action, else first contact, else
// none (no outreach has been recorded yet).
function anchorDate(contact) {
  return contact.lastDate || contact.firstDate || null;
}

// Whole days elapsed since `date` (a Date | string). Callers handle the
// no-date case via anchorDate; a malformed date is treated as "long ago".
function daysSince(date) {
  const t = date instanceof Date ? date.getTime() : new Date(date).getTime();
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - t) / MS_PER_DAY);
}

// How many days to wait before this contact is due for a chase.
export function waitFor(contact, timers = DEFAULT_TIMERS) {
  if (contact.stage === 'contacted') return MSG_FOLLOWUP;
  const lane = timers[contact.lane];
  return lane != null ? lane : 7;
}

// Days remaining before a chase is due (negative once overdue). Counts from the
// last action (`lastDate`), falling back to first contact (`firstDate`). Returns
// null when no outreach timestamp exists — the countdown is simply unknown.
export function daysLeft(contact, timers = DEFAULT_TIMERS) {
  const anchor = anchorDate(contact);
  if (!anchor) return null;
  return waitFor(contact, timers) - daysSince(anchor);
}

// Is this contact due for a follow-up right now?
export function isDue(contact, timers = DEFAULT_TIMERS) {
  if (!DUE_STAGES.has(contact.stage)) return false;
  if ((contact.followups || 0) >= (timers.max || 2)) return false;
  if (waitFor(contact, timers) <= 0) return false;
  const left = daysLeft(contact, timers);
  return left != null && left <= 0;
}

// Attach derived follow-up fields to a contact for API responses.
export function withFollowupInfo(contact, timers = DEFAULT_TIMERS) {
  return { ...contact, daysLeft: daysLeft(contact, timers), isDue: isDue(contact, timers) };
}
