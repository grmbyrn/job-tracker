// Integration tests run against the same Postgres instance as dev, but in a
// dedicated `test` schema so they never touch dev data. Derive that URL from the
// existing DATABASE_URL by forcing the schema search path to `test`.
export function withTestSchema(url) {
  if (!url) {
    throw new Error('DATABASE_URL is required to run the server tests (see server/.env).');
  }
  const u = new URL(url);
  u.searchParams.set('schema', 'test');
  return u.toString();
}
