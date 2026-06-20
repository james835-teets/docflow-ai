import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { createTestApp, cleanDatabase } from '../helpers/test-app.js';

let app: FastifyInstance;
let db: PrismaClient;
let tenantId: string;
let adminToken: string;

beforeAll(async () => {
  const t = createTestApp();
  app = t.app;
  db = t.db;
  await app.ready();
});

afterAll(async () => {
  await cleanDatabase(db);
  await db.$disconnect();
  await app.close();
});

beforeEach(async () => {
  const slug = `tu-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const tenant = await db.tenant.create({ data: { name: 'Test Corp TU', slug } });
  tenantId = tenant.id;

  const reg = await app.inject({
    method: 'POST', url: '/auth/register',
    payload: { tenantId, email: 'admin@test.com', password: 'password-123', name: 'Admin', role: 'ADMIN' },
  });
  adminToken = reg.json().data.token;
});

describe('Tenants CRUD', () => {
  it('creates a new tenant', async () => {
    const uniqueSlug = `new-corp-${Date.now()}`;
    const res = await app.inject({
      method: 'POST', url: '/tenants',
      payload: { name: 'New Corp', slug: uniqueSlug },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.slug).toBe(uniqueSlug);
  });

  it('rejects duplicate slug', async () => {
    const dupeSlug = `dupe-${Date.now()}`;
    await app.inject({ method: 'POST', url: '/tenants', payload: { name: 'First', slug: dupeSlug } });
    const res = await app.inject({
      method: 'POST', url: '/tenants',
      payload: { name: 'Second', slug: dupeSlug },
    });
    expect(res.statusCode).toBe(409);
  });

  it('lists tenants (admin only)', async () => {
    const res = await app.inject({
      method: 'GET', url: '/tenants',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.length).toBeGreaterThan(0);
  });

  it('updates a tenant', async () => {
    const res = await app.inject({
      method: 'PATCH', url: `/tenants/${tenantId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: 'Updated Corp' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.name).toBe('Updated Corp');
  });
});

describe('Users CRUD', () => {
  it('lists users in tenant', async () => {
    const res = await app.inject({
      method: 'GET', url: '/users',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.length).toBe(1);
  });

  it('gets user by id', async () => {
    const users = await app.inject({
      method: 'GET', url: '/users',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    const userId = users.json().data[0].id;

    const res = await app.inject({
      method: 'GET', url: `/users/${userId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.email).toBe('admin@test.com');
  });

  it('updates user role', async () => {
    await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { tenantId, email: 'member@test.com', password: 'password-123', name: 'Member' },
    });

    const users = await app.inject({
      method: 'GET', url: '/users',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    const memberId = users.json().data.find((u: { email: string }) => u.email === 'member@test.com').id;

    const res = await app.inject({
      method: 'PATCH', url: `/users/${memberId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { role: 'VIEWER' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.role).toBe('VIEWER');
  });

  it('tenant isolation: cannot see users from other tenant', async () => {
    const t2 = await db.tenant.create({ data: { name: 'Other', slug: `other-${Date.now()}` } });
    const reg = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { tenantId: t2.id, email: 'other@test.com', password: 'password-123', name: 'Other Admin', role: 'ADMIN' },
    });
    const otherToken = reg.json().data.token;

    const res = await app.inject({
      method: 'GET', url: '/users',
      headers: { authorization: `Bearer ${otherToken}` },
    });
    expect(res.statusCode).toBe(200);
    const emails = res.json().data.map((u: { email: string }) => u.email);
    expect(emails).not.toContain('admin@test.com');
  });
});
