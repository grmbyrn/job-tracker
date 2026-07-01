import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';
import { withTestSchema } from './test/testDbUrl.js';

// Load server/.env so we can derive the test DATABASE_URL from the dev one.
config();

export default defineConfig({
  test: {
    globalSetup: ['./test/globalSetup.js'],
    setupFiles: ['./test/setup.js'],
    // Tests share one Postgres schema and truncate between tests, so run files
    // serially to avoid cross-file interference.
    fileParallelism: false,
    // Applied to process.env in the worker before any module (db.js, tokens.js)
    // reads it, so the app connects to the test schema with valid JWT secrets.
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: withTestSchema(process.env.DATABASE_URL),
      JWT_SECRET: process.env.JWT_SECRET || 'test-access-secret',
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'test-refresh-secret',
    },
  },
});
