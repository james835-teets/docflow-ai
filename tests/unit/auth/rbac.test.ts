import { describe, it, expect } from 'vitest';
import { requireRole, requireMinRole } from '../../../src/shared/middleware/rbac.js';

function mockRequest(role?: string) {
  return {
    currentUser: role
      ? { id: '1', tenantId: 't1', role, email: 'a@b.com', authMethod: 'jwt' as const }
      : undefined,
  } as any;
}

const mockReply = {} as any;

describe('RBAC Middleware', () => {
  describe('requireRole', () => {
    it('allows matching role', async () => {
      const hook = requireRole('ADMIN');
      await expect(hook(mockRequest('ADMIN'), mockReply)).resolves.toBeUndefined();
    });

    it('allows any of multiple roles', async () => {
      const hook = requireRole('ADMIN', 'MEMBER');
      await expect(hook(mockRequest('MEMBER'), mockReply)).resolves.toBeUndefined();
    });

    it('rejects non-matching role', async () => {
      const hook = requireRole('ADMIN');
      await expect(hook(mockRequest('VIEWER'), mockReply)).rejects.toThrow(AppError);
      await expect(hook(mockRequest('VIEWER'), mockReply)).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it('rejects unauthenticated request', async () => {
      const hook = requireRole('ADMIN');
      await expect(hook(mockRequest(), mockReply)).rejects.toMatchObject({
        statusCode: 401,
      });
    });
  });

  describe('requireMinRole', () => {
    it('allows ADMIN when minimum is MEMBER', async () => {
      const hook = requireMinRole('MEMBER');
      await expect(hook(mockRequest('ADMIN'), mockReply)).resolves.toBeUndefined();
    });

    it('allows exact minimum role', async () => {
      const hook = requireMinRole('MEMBER');
      await expect(hook(mockRequest('MEMBER'), mockReply)).resolves.toBeUndefined();
    });

    it('rejects role below minimum', async () => {
      const hook = requireMinRole('MEMBER');
      await expect(hook(mockRequest('VIEWER'), mockReply)).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it('VIEWER can access VIEWER-minimum endpoints', async () => {
      const hook = requireMinRole('VIEWER');
      await expect(hook(mockRequest('VIEWER'), mockReply)).resolves.toBeUndefined();
    });
  });
});
