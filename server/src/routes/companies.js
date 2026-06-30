import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncHandler, ApiError } from '../lib/http.js';
import { validate } from '../lib/validate.js';
import { createCompanySchema, updateCompanySchema } from '../validation/schemas.js';
import { withFollowupInfo } from '../domain/followup.js';

export const companiesRouter = Router();

// A company's progress is derived from real contacts (roadmap decision): count
// linked contacts whose stage is past `hit` (i.e. outreach has started).
const contactedCount = (contacts) => contacts.filter((c) => c.stage !== 'hit').length;

// GET /api/companies — the user's companies with a derived contacted count.
companiesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const companies = await prisma.company.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      include: { contacts: { select: { id: true, stage: true } } },
    });
    res.json({
      companies: companies.map(({ contacts, ...c }) => ({
        ...c,
        contactsTotal: contacts.length,
        contactedCount: contactedCount(contacts),
      })),
    });
  }),
);

// GET /api/companies/:id — one company with nested contacts + derived count.
companiesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const company = await prisma.company.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { contacts: { orderBy: { createdAt: 'desc' } } },
    });
    if (!company) throw new ApiError(404, 'Company not found.');
    res.json({
      company: {
        ...company,
        contacts: company.contacts.map((c) => withFollowupInfo(c)),
        contactsTotal: company.contacts.length,
        contactedCount: contactedCount(company.contacts),
      },
    });
  }),
);

// POST /api/companies
companiesRouter.post(
  '/',
  validate(createCompanySchema),
  asyncHandler(async (req, res) => {
    const company = await prisma.company.create({
      data: { ...req.body, userId: req.userId },
    });
    res.status(201).json({ company });
  }),
);

// PATCH /api/companies/:id
companiesRouter.patch(
  '/:id',
  validate(updateCompanySchema),
  asyncHandler(async (req, res) => {
    const { count } = await prisma.company.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data: req.body,
    });
    if (count === 0) throw new ApiError(404, 'Company not found.');
    const company = await prisma.company.findUnique({ where: { id: req.params.id } });
    res.json({ company });
  }),
);

// DELETE /api/companies/:id — linked contacts are set null (schema onDelete).
companiesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { count } = await prisma.company.deleteMany({
      where: { id: req.params.id, userId: req.userId },
    });
    if (count === 0) throw new ApiError(404, 'Company not found.');
    res.status(204).end();
  }),
);
