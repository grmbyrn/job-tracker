import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncHandler, ApiError } from '../lib/http.js';
import { validate } from '../lib/validate.js';
import { createApplicationSchema, updateApplicationSchema } from '../validation/schemas.js';

export const applicationsRouter = Router();

// GET /api/applications
applicationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const applications = await prisma.application.findMany({
      where: { userId: req.userId },
      orderBy: { appliedDate: 'desc' },
    });
    res.json({ applications });
  }),
);

// GET /api/applications/:id
applicationsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const application = await prisma.application.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!application) throw new ApiError(404, 'Application not found.');
    res.json({ application });
  }),
);

// POST /api/applications
applicationsRouter.post(
  '/',
  validate(createApplicationSchema),
  asyncHandler(async (req, res) => {
    const application = await prisma.application.create({
      data: { ...req.body, userId: req.userId },
    });
    res.status(201).json({ application });
  }),
);

// PATCH /api/applications/:id
applicationsRouter.patch(
  '/:id',
  validate(updateApplicationSchema),
  asyncHandler(async (req, res) => {
    const { count } = await prisma.application.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data: req.body,
    });
    if (count === 0) throw new ApiError(404, 'Application not found.');
    const application = await prisma.application.findUnique({ where: { id: req.params.id } });
    res.json({ application });
  }),
);

// DELETE /api/applications/:id
applicationsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { count } = await prisma.application.deleteMany({
      where: { id: req.params.id, userId: req.userId },
    });
    if (count === 0) throw new ApiError(404, 'Application not found.');
    res.status(204).end();
  }),
);
