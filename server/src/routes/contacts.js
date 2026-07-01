import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncHandler, ApiError } from '../lib/http.js';
import { validate } from '../lib/validate.js';
import {
  createContactSchema,
  updateContactSchema,
  stageTransitionSchema,
} from '../validation/schemas.js';
import { withFollowupInfo } from '../domain/followup.js';
import { loadTimers } from '../domain/settings.js';
import { nestedActivitiesRouter } from './activities.js';

export const contactsRouter = Router();

// Activity timeline lives under a contact: /api/contacts/:id/activities.
contactsRouter.use('/:id/activities', nestedActivitiesRouter);

// Attach the user's effective follow-up timers so every derived daysLeft/isDue
// below reflects their settings (Phase 6). One lookup per contacts request; the
// activities sub-router above short-circuits before this and doesn't need it.
contactsRouter.use(
  asyncHandler(async (req, res, next) => {
    req.timers = await loadTimers(req.userId);
    next();
  }),
);

// Stages whose entry counts as fresh outreach: stamp the dates and reset the
// follow-up counter (mirrors the prototype's sent/contacted transitions).
const STAMPS_OUTREACH = new Set(['sent', 'contacted']);

// Guard: a contact may only link to a company the requester owns. Throws 400
// if the companyId doesn't resolve to one of their companies.
async function assertCompanyOwned(companyId, userId) {
  if (!companyId) return;
  const company = await prisma.company.findFirst({ where: { id: companyId, userId } });
  if (!company) throw new ApiError(400, 'companyId does not reference one of your companies.');
}

// Load a contact owned by the user or 404.
async function findOwnedContact(id, userId) {
  const contact = await prisma.contact.findFirst({ where: { id, userId } });
  if (!contact) throw new ApiError(404, 'Contact not found.');
  return contact;
}

// GET /api/contacts — all of the user's contacts, with derived daysLeft/isDue.
contactsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const contacts = await prisma.contact.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ contacts: contacts.map((c) => withFollowupInfo(c, req.timers)) });
  }),
);

// GET /api/contacts/:id — one contact with its activity timeline.
contactsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const contact = await prisma.contact.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { activities: { orderBy: { createdAt: 'desc' } } },
    });
    if (!contact) throw new ApiError(404, 'Contact not found.');
    res.json({ contact: withFollowupInfo(contact, req.timers) });
  }),
);

// POST /api/contacts
contactsRouter.post(
  '/',
  validate(createContactSchema),
  asyncHandler(async (req, res) => {
    await assertCompanyOwned(req.body.companyId, req.userId);
    const contact = await prisma.contact.create({
      data: { ...req.body, userId: req.userId },
    });
    res.status(201).json({ contact: withFollowupInfo(contact, req.timers) });
  }),
);

// PATCH /api/contacts/:id — general field edits (not the guided stage transition).
contactsRouter.patch(
  '/:id',
  validate(updateContactSchema),
  asyncHandler(async (req, res) => {
    await findOwnedContact(req.params.id, req.userId);
    if ('companyId' in req.body) await assertCompanyOwned(req.body.companyId, req.userId);
    const contact = await prisma.contact.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ contact: withFollowupInfo(contact, req.timers) });
  }),
);

// PATCH /api/contacts/:id/stage — guided pipeline transition. Stamps dates and
// resets followups on fresh outreach, and logs a status_change activity, all in
// one transaction.
contactsRouter.patch(
  '/:id/stage',
  validate(stageTransitionSchema),
  asyncHandler(async (req, res) => {
    const existing = await findOwnedContact(req.params.id, req.userId);
    const { stage } = req.body;

    const data = { stage };
    if (STAMPS_OUTREACH.has(stage)) {
      const now = new Date();
      data.firstDate = now;
      data.lastDate = now;
      data.followups = 0;
    }

    const [contact] = await prisma.$transaction([
      prisma.contact.update({ where: { id: existing.id }, data }),
      prisma.activity.create({
        data: {
          contactId: existing.id,
          type: 'status_change',
          body: `Stage: ${existing.stage} → ${stage}`,
        },
      }),
    ]);
    res.json({ contact: withFollowupInfo(contact, req.timers) });
  }),
);

// POST /api/contacts/:id/followup — record a follow-up nudge: bump the counter,
// refresh lastDate, and log a followup activity.
contactsRouter.post(
  '/:id/followup',
  asyncHandler(async (req, res) => {
    const existing = await findOwnedContact(req.params.id, req.userId);
    const [contact] = await prisma.$transaction([
      prisma.contact.update({
        where: { id: existing.id },
        data: { followups: { increment: 1 }, lastDate: new Date() },
      }),
      prisma.activity.create({
        data: { contactId: existing.id, type: 'followup', body: 'Follow-up sent.' },
      }),
    ]);
    res.json({ contact: withFollowupInfo(contact, req.timers) });
  }),
);

// DELETE /api/contacts/:id — cascades the contact's activities (schema onDelete).
contactsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { count } = await prisma.contact.deleteMany({
      where: { id: req.params.id, userId: req.userId },
    });
    if (count === 0) throw new ApiError(404, 'Contact not found.');
    res.status(204).end();
  }),
);
