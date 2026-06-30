import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncHandler, ApiError } from '../lib/http.js';
import { validate } from '../lib/validate.js';
import { createActivitySchema } from '../validation/schemas.js';

// Nested under a contact: /api/contacts/:id/activities. mergeParams exposes the
// parent :id. Mounted from the contacts router.
export const nestedActivitiesRouter = Router({ mergeParams: true });

// Confirm the parent contact belongs to the requester or 404.
async function assertContactOwned(contactId, userId) {
  const contact = await prisma.contact.findFirst({ where: { id: contactId, userId } });
  if (!contact) throw new ApiError(404, 'Contact not found.');
}

// GET /api/contacts/:id/activities — the contact's timeline, newest first.
nestedActivitiesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    await assertContactOwned(req.params.id, req.userId);
    const activities = await prisma.activity.findMany({
      where: { contactId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ activities });
  }),
);

// POST /api/contacts/:id/activities — add a note / logged interaction.
nestedActivitiesRouter.post(
  '/',
  validate(createActivitySchema),
  asyncHandler(async (req, res) => {
    await assertContactOwned(req.params.id, req.userId);
    const activity = await prisma.activity.create({
      data: { ...req.body, contactId: req.params.id },
    });
    res.status(201).json({ activity });
  }),
);

// Standalone: /api/activities. Only DELETE by id (creation is contact-scoped).
export const activitiesRouter = Router();

// DELETE /api/activities/:id — scoped to activities on the user's own contacts.
activitiesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { count } = await prisma.activity.deleteMany({
      where: { id: req.params.id, contact: { userId: req.userId } },
    });
    if (count === 0) throw new ApiError(404, 'Activity not found.');
    res.status(204).end();
  }),
);
