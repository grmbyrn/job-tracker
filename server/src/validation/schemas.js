import { z } from 'zod';

// Enum values mirror the Prisma schema (server/prisma/schema.prisma).
export const LANES = ['Agency', 'Company', 'Freelance', 'Warm'];
export const CHANNELS = ['Email', 'LinkedIn', 'Instagram', 'WhatsApp', 'Form', 'InPerson', 'Other'];
export const STAGES = ['hit', 'sent', 'accepted', 'contacted', 'communication'];
export const APP_STATUSES = ['applied', 'interview', 'offer', 'rejected'];

// Trimmed non-empty string with a max length.
const text = (max = 255) => z.string().trim().min(1).max(max);
// Optional free text: empty string / null both normalize to null.
const optionalText = (max = 1000) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

// Optional date that tolerates the prototype's empty-string/missing dates:
// '' / null / undefined → null, otherwise coerced from a date string (YYYY-MM-DD).
const optionalDate = z.preprocess(
  (v) => (v === '' || v == null ? null : v),
  z.coerce.date().nullable(),
);

// Require at least one field on a PATCH body so empty updates are rejected.
const nonEmpty = (schema) =>
  schema.refine((obj) => Object.keys(obj).length > 0, {
    message: 'Provide at least one field to update.',
  });

// --- Companies ---
export const createCompanySchema = z.object({ name: text(), link: optionalText(2048) }).strict();

export const updateCompanySchema = nonEmpty(createCompanySchema.partial());

// --- Contacts ---
export const createContactSchema = z
  .object({
    name: text(),
    person: optionalText(255),
    personRole: optionalText(255),
    link: optionalText(2048),
    companyId: z
      .string()
      .nullish()
      .transform((v) => (v ? v : null)),
    lane: z.enum(LANES),
    channel: z.enum(CHANNELS),
    stage: z.enum(STAGES).optional(),
    firstDate: z.coerce.date().nullish(),
    lastDate: z.coerce.date().nullish(),
    followups: z.number().int().min(0).optional(),
  })
  .strict();

// `stage` is intentionally omitted: stage changes go through the guided
// PATCH /:id/stage transition (date stamps, followup reset, activity log).
export const updateContactSchema = nonEmpty(createContactSchema.omit({ stage: true }).partial());

// Pipeline transition: just the target stage; the route applies the side effects.
export const stageTransitionSchema = z.object({ stage: z.enum(STAGES) }).strict();

// --- Activities ---
// Only user-authored types are creatable via the API; `status_change` and
// `followup` are written by the server (stage transition / followup endpoints)
// so clients can't forge system events in the timeline.
export const createActivitySchema = z
  .object({
    type: z.enum(['note', 'reply']),
    body: optionalText(2000),
  })
  .strict();

// --- Settings (Phase 6) ---
// Per-user follow-up timers. All fields optional so the client can save a subset;
// the route merges over the stored/default timers. Lane timers allow 0 (Warm's
// "never auto-surface"); `max` is at least 1.
const dayTimer = z.number().int().min(0).max(365);
export const updateTimersSchema = z
  .object({
    Agency: dayTimer,
    Company: dayTimer,
    Freelance: dayTimer,
    Warm: dayTimer,
    max: z.number().int().min(1).max(20),
  })
  .partial()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'Provide at least one timer to update.',
  });

export const updateSettingsSchema = z.object({ timers: updateTimersSchema }).strict();

// --- Applications ---
export const createApplicationSchema = z
  .object({
    company: text(),
    position: optionalText(255),
    link: optionalText(2048),
    note: optionalText(2000),
    appliedDate: z.coerce.date(),
    status: z.enum(APP_STATUSES).optional(),
  })
  .strict();

export const updateApplicationSchema = nonEmpty(createApplicationSchema.partial());

// --- Import (Phase 4) ---
// Shape of the prototype's "Export backup" JSON ({ items, apps, targets, timers }).
// Lenient by design: unknown keys (the prototype's client-side `id`s) are stripped
// rather than rejected, statuses are normalized, and missing/empty values fall back
// to sensible defaults so a real backup file imports without hand-editing.

// Prototype contact statuses include the legacy `reply` (renamed `accepted` here).
const PROTO_STATUSES = [...STAGES, 'reply'];

// items[] → Contact. `status` is renamed to `stage` (legacy `reply` → `accepted`);
// the free-text `note` is carried through for the route to log as a "note" Activity
// (the Contact model has no note field — the activity timeline replaces it).
const importContactSchema = z
  .object({
    name: text(),
    person: optionalText(255),
    personRole: optionalText(255),
    link: optionalText(2048),
    lane: z.enum(LANES),
    channel: z.enum(CHANNELS),
    note: optionalText(2000),
    status: z.enum(PROTO_STATUSES).default('hit'),
    firstDate: optionalDate,
    lastDate: optionalDate,
    followups: z.coerce.number().int().min(0).catch(0),
  })
  .transform(({ status, ...rest }) => ({
    ...rest,
    stage: status === 'reply' ? 'accepted' : status,
  }));

// apps[] → Application. A missing/empty appliedDate defaults to now.
const importApplicationSchema = z.object({
  company: text(),
  position: optionalText(255),
  link: optionalText(2048),
  note: optionalText(2000),
  appliedDate: z.preprocess((v) => (v ? v : new Date()), z.coerce.date()),
  status: z.enum(APP_STATUSES).default('applied'),
});

// targets[] → Company.
const importCompanySchema = z.object({
  name: text(),
  link: optionalText(2048),
  contacted: z.coerce.number().int().min(0).catch(0),
});

export const importSchema = z.object({
  items: z.array(importContactSchema).default([]),
  apps: z.array(importApplicationSchema).default([]),
  targets: z.array(importCompanySchema).default([]),
  // Echoed back in the response; not persisted yet (no Settings model — Phase 6).
  timers: z.record(z.string(), z.number()).optional(),
});
