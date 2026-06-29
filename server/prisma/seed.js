import bcrypt from 'bcrypt';
import { prisma } from '../src/db.js';

// Dev seed data. Idempotent: clears this user's graph, then recreates it.
// The seed user gets a real bcrypt hash so the account can actually log in;
// the plaintext dev password comes from SEED_USER_PASSWORD (see .env.example).
const SEED_EMAIL = 'dev@jobtracker.local';
const SEED_PASSWORD = process.env.SEED_USER_PASSWORD || 'devpassword123';
const BCRYPT_COST = 12;

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

async function main() {
  // Remove any prior seed user; cascades clear their companies/contacts/etc.
  await prisma.user.deleteMany({ where: { email: SEED_EMAIL } });

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, BCRYPT_COST);
  const user = await prisma.user.create({
    data: { email: SEED_EMAIL, passwordHash },
  });

  const acme = await prisma.company.create({
    data: {
      userId: user.id,
      name: 'Acme Studio',
      link: 'https://acme.example',
      contacted: 2,
    },
  });

  const globex = await prisma.company.create({
    data: {
      userId: user.id,
      name: 'Globex Agency',
      link: 'https://globex.example',
      contacted: 1,
    },
  });

  // A contact in early pipeline, no outreach yet.
  await prisma.contact.create({
    data: {
      userId: user.id,
      companyId: acme.id,
      name: 'Acme Studio',
      person: 'Dana Reyes',
      personRole: 'Creative Director',
      link: 'https://linkedin.com/in/danareyes',
      lane: 'Company',
      channel: 'Email',
      stage: 'hit',
    },
  });

  // A contacted person awaiting reply — drives the follow-up countdown.
  await prisma.contact.create({
    data: {
      userId: user.id,
      companyId: acme.id,
      name: 'Acme Studio',
      person: 'Sam Okafor',
      personRole: 'Recruiter',
      lane: 'Company',
      channel: 'LinkedIn',
      stage: 'sent',
      firstDate: daysAgo(9),
      lastDate: daysAgo(9),
      followups: 1,
      activities: {
        create: [
          { type: 'note', body: 'Sent intro message with portfolio link.', createdAt: daysAgo(9) },
          { type: 'followup', body: 'First follow-up nudge.', createdAt: daysAgo(2) },
        ],
      },
    },
  });

  // An agency lead who replied / accepted.
  await prisma.contact.create({
    data: {
      userId: user.id,
      companyId: globex.id,
      name: 'Globex Agency',
      person: 'Priya Nair',
      personRole: 'Talent Lead',
      lane: 'Agency',
      channel: 'Email',
      stage: 'accepted',
      firstDate: daysAgo(14),
      lastDate: daysAgo(3),
      activities: {
        create: [
          { type: 'reply', body: 'Replied — wants to set up a call.', createdAt: daysAgo(3) },
        ],
      },
    },
  });

  // A warm intro, no company linked.
  await prisma.contact.create({
    data: {
      userId: user.id,
      name: 'Jordan Lee',
      person: 'Jordan Lee',
      personRole: 'Former colleague',
      lane: 'Warm',
      channel: 'WhatsApp',
      stage: 'communication',
      firstDate: daysAgo(20),
      lastDate: daysAgo(1),
    },
  });

  await prisma.application.createMany({
    data: [
      {
        userId: user.id,
        company: 'Acme Studio',
        position: 'Senior Frontend Engineer',
        link: 'https://acme.example/jobs/fe',
        appliedDate: daysAgo(12),
        status: 'interview',
      },
      {
        userId: user.id,
        company: 'Initech',
        position: 'Full-stack Developer',
        appliedDate: daysAgo(5),
        status: 'applied',
        note: 'Referred by Jordan.',
      },
    ],
  });

  const [companies, contacts, activities, applications] = await Promise.all([
    prisma.company.count({ where: { userId: user.id } }),
    prisma.contact.count({ where: { userId: user.id } }),
    prisma.activity.count({ where: { contact: { userId: user.id } } }),
    prisma.application.count({ where: { userId: user.id } }),
  ]);

  console.log(
    `Seeded ${SEED_EMAIL}: ${companies} companies, ${contacts} contacts, ${activities} activities, ${applications} applications.`,
  );
  console.log(`Dev login: ${SEED_EMAIL} / ${SEED_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
