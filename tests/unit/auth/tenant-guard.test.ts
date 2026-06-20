import { describe, it, expect } from 'vitest';
import { tenantGuard } from '../../../src/shared/middleware/tenant-guard.js';
import { AppError } from '../../../src/shared/errors/app-error.js';

function mockRequest(tenantId?: string, pathTenantId?: string) {
  return {
    currentUser: tenantId
      ? { id: '1', tenantId, role: 'ADMIN', email: 'a@b.com', authMethod: 'jwt' as const }
      : undefined,
    params: pathTenantId ? { tenantId: pathTenantId } : {},
  } as any;
}

const mockReply = {} as any;

describe('tenantGuard', () => {
  it('passes when user tenant matches path tenant', async () => {
    await expect(tenantGuard(mockRequest('t1', 't1'), mockReply)).resolves.toBeUndefined();
  });

  it('passes when no tenantId in path params', async () => {
    await expect(tenantGuard(mockRequest('t1'), mockReply)).resolves.toBeUndefined();
  });

  it('rejects cross-tenant access', async () => {
    await expect(tenantGuard(mockRequest('t1', 't2'), mockReply)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('rejects unauthenticated request', async () => {
    await expect(tenantGuard(mockRequest(), mockReply)).rejects.toMatchObject({
      statusCode: 401,
    });
  });
});
