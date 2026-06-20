import { describe, it, expect } from 'vitest';
import { JwtService } from '../../../src/modules/auth/services/jwt.service.js';

describe('JwtService', () => {
  const service = new JwtService('test-secret-that-is-long-enough-32chars!', '1h');

  const payload = {
    sub: 'user-123',
    tenantId: 'tenant-456',
    role: 'ADMIN',
    email: 'test@example.com',
  };

  it('signs and verifies a token', () => {
    const token = service.sign(payload);
    expect(token).toBeTruthy();
    expect(token.split('.')).toHaveLength(3);

    const decoded = service.verify(token);
    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.tenantId).toBe(payload.tenantId);
    expect(decoded.role).toBe(payload.role);
    expect(decoded.email).toBe(payload.email);
  });

  it('throws on invalid token', () => {
    expect(() => service.verify('invalid.token.here')).toThrow();
  });

  it('throws on token signed with different secret', () => {
    const otherService = new JwtService('different-secret-that-is-also-32chars!', '1h');
    const token = otherService.sign(payload);
    expect(() => service.verify(token)).toThrow();
  });

  it('throws on expired token', () => {
    const shortLivedService = new JwtService('test-secret-that-is-long-enough-32chars!', '0s');
    const token = shortLivedService.sign(payload);
    expect(() => service.verify(token)).toThrow();
  });
});
