import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema, createApiKeySchema } from '../../../src/modules/auth/schemas.js';

describe('Auth Schemas', () => {
  describe('registerSchema', () => {
    it('accepts valid input', () => {
      const result = registerSchema.safeParse({
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'user@example.com',
        password: 'secure-pass-123',
        name: 'John Doe',
      });
      expect(result.success).toBe(true);
    });

    it('rejects short password', () => {
      const result = registerSchema.safeParse({
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'user@example.com',
        password: 'short',
        name: 'John Doe',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid email', () => {
      const result = registerSchema.safeParse({
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'not-an-email',
        password: 'secure-pass-123',
        name: 'John Doe',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid tenant UUID', () => {
      const result = registerSchema.safeParse({
        tenantId: 'not-a-uuid',
        email: 'user@example.com',
        password: 'secure-pass-123',
        name: 'John Doe',
      });
      expect(result.success).toBe(false);
    });

    it('accepts optional role', () => {
      const result = registerSchema.safeParse({
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'user@example.com',
        password: 'secure-pass-123',
        name: 'John Doe',
        role: 'ADMIN',
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.role).toBe('ADMIN');
    });

    it('rejects invalid role', () => {
      const result = registerSchema.safeParse({
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'user@example.com',
        password: 'secure-pass-123',
        name: 'John Doe',
        role: 'SUPERUSER',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('accepts valid credentials', () => {
      const result = loginSchema.safeParse({
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'user@example.com',
        password: 'any-password',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty password', () => {
      const result = loginSchema.safeParse({
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'user@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createApiKeySchema', () => {
    it('accepts name only', () => {
      const result = createApiKeySchema.safeParse({ name: 'My Integration' });
      expect(result.success).toBe(true);
    });

    it('accepts with permissions', () => {
      const result = createApiKeySchema.safeParse({
        name: 'Read-Only Key',
        permissions: ['read'],
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty name', () => {
      const result = createApiKeySchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });

    it('rejects invalid permissions', () => {
      const result = createApiKeySchema.safeParse({
        name: 'Key',
        permissions: ['delete'],
      });
      expect(result.success).toBe(false);
    });
  });
});
