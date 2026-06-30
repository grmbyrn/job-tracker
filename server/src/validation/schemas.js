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
