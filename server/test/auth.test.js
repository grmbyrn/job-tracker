import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, registerUser } from './helpers.js';

describe('auth', () => {
  describe('POST /api/auth/register', () => {
    it('creates a user, returns an access token, and sets the refresh cookie', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'new@test.dev', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body.accessToken).toBeTruthy();
      expect(res.body.user).toMatchObject({ email: 'new@test.dev' });
      expect(res.body.user.passwordHash).toBeUndefined();

      const cookies = res.headers['set-cookie'].join(';');
      expect(cookies).toContain('refreshToken=');
      expect(cookies).toContain('HttpOnly');
    });

    it('rejects a duplicate email with 409', async () => {
      await registerUser('dupe@test.dev');
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'dupe@test.dev', password: 'password123' });
      expect(res.status).toBe(409);
    });

    it('rejects a too-short password with 400', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'short@test.dev', password: 'nope' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in with correct credentials', async () => {
      const { email, password } = await registerUser('login@test.dev');
      const res = await request(app).post('/api/auth/login').send({ email, password });
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeTruthy();
    });

    it('rejects a wrong password with 401', async () => {
      const { email } = await registerUser('wrongpw@test.dev');
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'wrongpassword' });
      expect(res.status).toBe(401);
    });

    it('rejects an unknown email with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ghost@test.dev', password: 'password123' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/me', () => {
    it('returns the current user with a valid token', async () => {
      const { token, email } = await registerUser('me@test.dev');
      const res = await request(app).get('/api/me').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(email);
    });

    it('rejects a request without a token with 401', async () => {
      const res = await request(app).get('/api/me');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('issues a new access token from the refresh cookie', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/auth/register')
        .send({ email: 'refresh@test.dev', password: 'password123' });

      const res = await agent.post('/api/auth/refresh');
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeTruthy();
    });

    it('rejects a refresh with no cookie with 401', async () => {
      const res = await request(app).post('/api/auth/refresh');
      expect(res.status).toBe(401);
    });
  });
});
