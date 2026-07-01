import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/http.js';
import { validate } from '../lib/validate.js';
import { updateSettingsSchema } from '../validation/schemas.js';
import { loadTimers } from '../domain/settings.js';

export const settingsRouter = Router();

// GET /api/settings — the user's follow-up timers, merged over the defaults.
settingsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ timers: await loadTimers(req.userId) });
  }),
);

// PUT /api/settings — persist (a subset of) the follow-up timers. The new values
// are merged over whatever's already stored, then saved as the full timer set.
settingsRouter.put(
  '/',
  validate(updateSettingsSchema),
  asyncHandler(async (req, res) => {
    const current = await loadTimers(req.userId);
    const timers = { ...current, ...req.body.timers };
    await prisma.user.update({ where: { id: req.userId }, data: { followupTimers: timers } });
    res.json({ timers });
  }),
);
