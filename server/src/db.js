import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Prisma 7 is driver-adapter-first: the client connects through a node-postgres
// adapter built from DATABASE_URL. Single shared instance for the whole process.
//
// The node-postgres adapter does NOT read the `?schema=` query param the way
// Prisma's native connector does — it must be passed explicitly as the adapter's
// `schema` option, or every query silently runs against `public`. This is what
// keeps the test suite's isolated `test` schema from clobbering dev data.
const schema = new URL(process.env.DATABASE_URL).searchParams.get('schema') || undefined;
const adapter = new PrismaPg(
  { connectionString: process.env.DATABASE_URL },
  schema ? { schema } : undefined,
);

export const prisma = new PrismaClient({ adapter });
