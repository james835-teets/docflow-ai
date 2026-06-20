import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../errors/app-error.js';

export async function tenantGuard(request: FastifyRequest, _reply: FastifyReply) {
  const user = request.currentUser;
  if (!user?.tenantId) {
    throw AppError.unauthorized('Tenant context is required');
  }

  const params = request.params as Record<string, unknown>;
  const tenantIdFromPath = params['tenantId'];

  if (typeof tenantIdFromPath === 'string' && tenantIdFromPath !== user.tenantId) {
    throw AppError.forbidden('Cannot access resources of another tenant');
  }
}
