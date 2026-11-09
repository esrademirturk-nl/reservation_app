import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../src/db/seed/seed';
import { createTestApp, uniqueEmail } from './app';

describe('Accounts (e2e)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(() => app.close());

  const register = (
    email: string,
    password = 'secret-pass1',
    fullName = 'Ayşe Yılmaz',
  ) => http().post('/api/v1/auth/register').send({ email, password, fullName });

  it('registers, returns tokens and a forwarding address', async () => {
    const email = uniqueEmail('reg');
    const res = await register(email.toUpperCase()).expect(201);
    expect(res.body.user).toMatchObject({
      email,
      fullName: 'Ayşe Yılmaz',
      language: 'en',
    });
    expect(res.body.user.forwardAddress).toMatch(/^ayse\d*@in\.waypad\.app$/);
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(res.body).toMatchObject({ tokenType: 'Bearer', expiresIn: 900 });
    expect(typeof res.body.accessToken).toBe('string');
    expect(typeof res.body.refreshToken).toBe('string');
  });

  it('gives each user a different alias', async () => {
    const a = await register(uniqueEmail('a')).expect(201);
    const b = await register(uniqueEmail('b')).expect(201);
    expect(a.body.user.forwardAddress).not.toEqual(b.body.user.forwardAddress);
  });

  it('rejects a duplicate email with 409 EMAIL_TAKEN', async () => {
    const email = uniqueEmail('dup');
    await register(email).expect(201);
    const res = await register(email).expect(409);
    expect(res.body.code).toBe('EMAIL_TAKEN');
  });

  it('validates input and returns the error shape', async () => {
    const res = await http()
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'short', fullName: '' })
      .expect(400);
    expect(res.body.code).toBe('BAD_REQUEST');
    expect(res.body.message).toBe('Validation failed');
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  it('logs the demo user in and wrong passwords get one generic 401', async () => {
    const ok = await http()
      .post('/api/v1/auth/login')
      .send({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
      .expect(200);
    expect(ok.body.user.forwardAddress).toBe('esra@in.waypad.app');

    const wrong = await http()
      .post('/api/v1/auth/login')
      .send({ email: DEMO_EMAIL, password: 'wrong-pass1' })
      .expect(401);
    const unknown = await http()
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@test.waypad.app', password: 'wrong-pass1' })
      .expect(401);
    expect(wrong.body).toEqual(unknown.body);
    expect(wrong.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('protects /me and updates the profile', async () => {
    await http().get('/api/v1/me').expect(401);
    await http()
      .get('/api/v1/me')
      .set('Authorization', 'Bearer nonsense')
      .expect(401);

    const { body } = await register(uniqueEmail('me')).expect(201);
    const auth = { Authorization: `Bearer ${body.accessToken}` };
    const me = await http().get('/api/v1/me').set(auth).expect(200);
    expect(me.body.id).toBe(body.user.id);

    const patched = await http()
      .patch('/api/v1/me')
      .set(auth)
      .send({ language: 'tr', budgetLevel: 3 })
      .expect(200);
    expect(patched.body).toMatchObject({ language: 'tr', budgetLevel: 3 });

    await http()
      .patch('/api/v1/me')
      .set(auth)
      .send({ email: 'x@y.z' })
      .expect(400);

    const fwd = await http()
      .get('/api/v1/me/forward-address')
      .set(auth)
      .expect(200);
    expect(fwd.body.forwardAddress).toBe(body.user.forwardAddress);
  });

  it('does not accept a refresh token as an access token', async () => {
    const { body } = await register(uniqueEmail('typ')).expect(201);
    await http()
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${body.refreshToken}`)
      .expect(401);
  });

  it('rotates refresh tokens and revokes the family when an old one is reused', async () => {
    const { body } = await register(uniqueEmail('rot')).expect(201);
    const first = body.refreshToken as string;

    const r1 = await http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: first })
      .expect(200);
    const second = r1.body.refreshToken as string;
    expect(second).not.toBe(first);

    // the old token is replayed (e.g. stolen) → both old and new stop working
    const reuse = await http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: first })
      .expect(401);
    expect(reuse.body.code).toBe('REFRESH_REUSED');
    await http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: second })
      .expect(401);
  });

  it('logout revokes the refresh token', async () => {
    const { body } = await register(uniqueEmail('out')).expect(201);
    await http()
      .post('/api/v1/auth/logout')
      .send({ refreshToken: body.refreshToken })
      .expect(204);
    await http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: body.refreshToken })
      .expect(401);
  });
});
