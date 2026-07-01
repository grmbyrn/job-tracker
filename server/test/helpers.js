import request from 'supertest';
import { createApp } from '../src/app.js';

// One app instance for the whole suite (no listener — Supertest drives it).
export const app = createApp();

// Register a fresh user and return its access token + identity. The DB is reset
// before each test, so a fixed email is fine.
export async function registerUser(email = 'user@test.dev', password = 'password123') {
  const res = await request(app).post('/api/auth/register').send({ email, password });
  return { token: res.body.accessToken, user: res.body.user, email, password };
}

// A Supertest request with the bearer token attached.
export function authed(token) {
  return {
    get: (url) => request(app).get(url).set('Authorization', `Bearer ${token}`),
    post: (url) => request(app).post(url).set('Authorization', `Bearer ${token}`),
    patch: (url) => request(app).patch(url).set('Authorization', `Bearer ${token}`),
    delete: (url) => request(app).delete(url).set('Authorization', `Bearer ${token}`),
  };
}
