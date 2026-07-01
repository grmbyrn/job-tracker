import { afterAll, beforeEach } from 'vitest';
import { prisma } from '../src/db.js';

// Clean slate before each test. Deleting users cascades companies, contacts,
// applications, and (via contacts) activities — see the schema's onDelete rules —
// so one delete wipes everything the tests create.
beforeEach(async () => {
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
