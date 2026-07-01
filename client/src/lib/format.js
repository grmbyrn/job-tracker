// Small display helpers shared by the views (ported from the prototype).

// Two-letter initials from a name; falls back to '?'.
export function initials(name) {
  const parts = (name || '').trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

// An ISO datetime (or null) → a YYYY-MM-DD string for <input type="date"> and
// the export backup; '' when there's no date.
export function toDateInput(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

// Today's date as YYYY-MM-DD (UTC — used for date inputs / backup filenames).
export function today() {
  return new Date().toISOString().slice(0, 10);
}

// Today's date in the browser's *local* timezone as YYYY-MM-DD. The Daily Plan
// rolls over at the user's own midnight, so it sends this rather than the UTC day.
export function localToday() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Whole days since a date (ISO string or Date).
export function daysSince(value) {
  const t = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.floor((Date.now() - t) / 86400000);
}

// Normalize a user-entered link to an href (prepend https:// when missing).
export function href(url) {
  return /^https?:/i.test(url) ? url : `https://${url}`;
}
