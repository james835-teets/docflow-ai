import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { createTestApp, cleanDatabase } from '../helpers/test-app.js';

let app: FastifyInstance;
let db: PrismaClient;
let tenantId: string;

beforeAll(async () => {
  const testApp = createTestApp();
  app = testApp.app;
  db = testApp.db;
  await app.ready();
});

afterAll(async () => {
  await cleanDatabase(db);
  await db.$disconnect();
  await app.close();
});

beforeEach(async () => {
  const slug = `auth-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const tenant = await db.tenant.create({
    data: { name: 'Test Corp Auth', slug },
  });
  tenantId = tenant.id;
});

describe('POST /auth/register', () => {
  it('registers a new user and returns JWT', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        tenantId,
        email: 'john@test.com',
        password: 'secure-password-123',
        name: 'John Doe',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data.token).toBeTruthy();
    expect(body.data.user.email).toBe('john@test.com');
    expect(body.data.user.role).toBe('MEMBER');
    expect(body.data.user.tenantId).toBe(tenantId);
  });

  it('rejects duplicate email in same tenant', async () => {
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        tenantId,
        email: 'john@test.com',
        password: 'secure-password-123',
        name: 'John Doe',
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        tenantId,
        email: 'john@test.com',
        password: 'another-password-123',
        name: 'John Doe 2',
      },
    });

    expect(response.statusCode).toBe(409);
  });

  it('rejects short password', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        tenantId,
        email: 'john@test.com',
        password: 'short',
        name: 'John Doe',
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('allows same email in different tenants', async () => {
    const tenant2 = await db.tenant.create({
      data: { name: 'Other Corp', slug: `other-${Date.now()}` },
    });

    const r1 = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { tenantId, email: 'shared@test.com', password: 'password-123', name: 'User 1' },
    });

    const r2 = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { tenantId: tenant2.id, email: 'shared@test.com', password: 'password-123', name: 'User 2' },
    });

    expect(r1.statusCode).toBe(201);
    expect(r2.statusCode).toBe(201);
  });
});

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        tenantId,
        email: 'login@test.com',
        password: 'secure-password-123',
        name: 'Login User',
      },
    });
  });

  it('returns JWT on valid credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { tenantId, email: 'login@test.com', password: 'secure-password-123' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.token).toBeTruthy();
    expect(body.data.user.email).toBe('login@test.com');
  });

  it('rejects wrong password', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { tenantId, email: 'login@test.com', password: 'wrong-password' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('rejects non-existent user', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { tenantId, email: 'nobody@test.com', password: 'any-password' },
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('GET /auth/me', () => {
  it('returns current user info with valid JWT', async () => {
    const registerRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { tenantId, email: 'me@test.com', password: 'password-123', name: 'Me' },
    });
    const token = registerRes.json().data.token;

    const response = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.email).toBe('me@test.com');
  });

  it('rejects request without token', async () => {
    const response = await app.inject({ method: 'GET', url: '/auth/me' });
    expect(response.statusCode).toBe(401);
  });

  it('rejects invalid token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: 'Bearer invalid-token' },
    });
    expect(response.statusCode).toBe(401);
  });
});

describe('API Keys (RBAC)', () => {
  let adminToken: string;
  let memberToken: string;
  let viewerToken: string;

  beforeEach(async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const admin = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { tenantId, email: `rbac-admin-${suffix}@test.com`, password: 'password-123', name: 'Admin', role: 'ADMIN' },
    });
    expect(admin.statusCode).toBe(201);
    adminToken = admin.json().data.token;

    const member = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { tenantId, email: `rbac-member-${suffix}@test.com`, password: 'password-123', name: 'Member' },
    });
    expect(member.statusCode).toBe(201);
    memberToken = member.json().data.token;

    const viewer = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { tenantId, email: `rbac-viewer-${suffix}@test.com`, password: 'password-123', name: 'Viewer', role: 'VIEWER' },
    });
    expect(viewer.statusCode).toBe(201);
    viewerToken = viewer.json().data.token;
  });

  it('ADMIN can create API key', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/api-keys',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: 'My Integration' },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.data.plainTextKey).toMatch(/^dfk_/);
    expect(body.data.name).toBe('My Integration');
  });

  it('MEMBER cannot create API key', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/api-keys',
      headers: { authorization: `Bearer ${memberToken}` },
      payload: { name: 'Forbidden Key' },
    });

    expect(response.statusCode).toBe(403);
  });

  it('ADMIN can list API keys', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/auth/api-keys',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(response.statusCode).toBe(200);
  });

  it('MEMBER can list API keys', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/auth/api-keys',
      headers: { authorization: `Bearer ${memberToken}` },
    });

    expect(response.statusCode).toBe(200);
  });

  it('VIEWER cannot list API keys', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/auth/api-keys',
      headers: { authorization: `Bearer ${viewerToken}` },
    });

    expect(response.statusCode).toBe(403);
  });

  it('ADMIN can revoke API key', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/auth/api-keys',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: 'To Revoke' },
    });
    const keyId = createRes.json().data.id;

    const response = await app.inject({
      method: 'DELETE',
      url: `/auth/api-keys/${keyId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.revoked).toBe(true);
  });
});
