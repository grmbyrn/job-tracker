import { execSync } from 'node:child_process';
import { config } from 'dotenv';
import { withTestSchema } from './testDbUrl.js';

// Runs once before the whole suite: apply migrations to the isolated `test`
// schema so the tables exist. `migrate deploy` is non-interactive and only
// applies already-committed migrations, which is what we want for tests/CI.
export default function setup() {
  config(); // load server/.env for the dev DATABASE_URL
  const DATABASE_URL = withTestSchema(process.env.DATABASE_URL);

  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    // dotenv (in prisma.config.ts) won't override an already-set env var, so the
    // test URL wins over server/.env here.
    env: { ...process.env, DATABASE_URL },
  });
}
