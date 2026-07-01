// Shared client constants mirrored from the prototype + server enums.

// Follow-up timer defaults (mirrors server DEFAULT_TIMERS) — used as the initial
// settings state before the API responds.
export const DEFAULT_TIMERS = { Agency: 7, Company: 7, Freelance: 7, Warm: 7, max: 2 };

// Lanes: enum value → display label for tabs and the add form.
export const LANES = [
  { value: 'Agency', label: 'Agency', tab: 'Agencies' },
  { value: 'Company', label: 'Company / job', tab: 'Companies' },
  { value: 'Freelance', label: 'Freelance opportunity', tab: 'Freelance' },
  { value: 'Warm', label: 'Warm contact', tab: 'Warm' },
];

// Outreach channels: enum value → display label.
export const CHANNELS = [
  { value: 'Email', label: 'Email' },
  { value: 'LinkedIn', label: 'LinkedIn' },
  { value: 'Instagram', label: 'Instagram' },
  { value: 'WhatsApp', label: 'WhatsApp' },
  { value: 'Form', label: 'Web form' },
  { value: 'InPerson', label: 'In person' },
  { value: 'Other', label: 'Other' },
];

// Per-target "reach out to 3 people" goal (mirrors server TARGET_GOAL).
export const TARGET_GOAL = 3;
