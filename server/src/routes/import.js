import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/http.js';
import { validate } from '../lib/validate.js';
import { importSchema } from '../validation/schemas.js';

export const importRouter = Router();

// Normalize a company/contact name into a match key for linking (trim + lowercase).
const nameKey = (name) => name.trim().toLowerCase();

// POST /api/import — restore a prototype "Export backup" file into the user's
// account. Maps the prototype's localStorage shape onto the Prisma models:
//   targets[] → Company   items[] → Contact (note → a "note" Activity)   apps[] → Application
// Contacts are linked to a company when their `name` matches a target's `name`.
//
// ?mode=replace wipes the user's existing companies/contacts/applications first
// (a true "restore"); the default ?mode=merge appends to whatever is already there.
// The whole thing runs in one transaction, so a validation/DB error leaves no
// partial import behind.
importRouter.post(
  '/',
  validate(importSchema),
  asyncHandler(async (req, res) => {
    const { items, apps, targets, timers } = req.body;
    const mode = req.query.mode === 'replace' ? 'replace' : 'merge';
    const userId = req.userId;

    const imported = await prisma.$transaction(
      async (tx) => {
        if (mode === 'replace') {
          // Order matters: applications + contacts (activities cascade) before
          // companies, which would otherwise null out their contacts.
          await tx.application.deleteMany({ where: { userId } });
          await tx.contact.deleteMany({ where: { userId } });
          await tx.company.deleteMany({ where: { userId } });
        }

        // Companies first so contacts can link to them by name.
        const companyIdByName = new Map();
        for (const company of targets) {
          const created = await tx.company.create({ data: { ...company, userId } });
          // First write wins if a backup somehow has duplicate company names.
          if (!companyIdByName.has(nameKey(company.name))) {
            companyIdByName.set(nameKey(company.name), created.id);
          }
        }

        // Contacts: link to a matching company, and turn the prototype's free-text
        // note into the contact's first timeline Activity.
        let activities = 0;
        for (const { note, ...fields } of items) {
          const companyId = companyIdByName.get(nameKey(fields.name)) ?? null;
          const contact = await tx.contact.create({ data: { ...fields, companyId, userId } });
          if (note) {
            await tx.activity.create({ data: { contactId: contact.id, type: 'note', body: note } });
            activities += 1;
          }
        }

        if (apps.length) {
          await tx.application.createMany({ data: apps.map((a) => ({ ...a, userId })) });
        }

        return {
          companies: targets.length,
          contacts: items.length,
          activities,
          applications: apps.length,
        };
      },
      // Generous timeout: a backup can hold many records and we create rows one by
      // one (needed to capture company ids for linking).
      { timeout: 30_000 },
    );

    res.status(201).json({
      mode,
      imported,
      // Per-user timer settings have no home yet (Settings model lands in Phase 6),
      // so we echo them back un-persisted rather than silently dropping them.
      timersIgnored: timers ?? null,
    });
  }),
);
