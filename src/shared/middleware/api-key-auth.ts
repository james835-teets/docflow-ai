import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ApiKeyService } from '../../modules/auth/services/api-key.service.js';
import { AppError } from '../errors/app-error.js';

export function createApiKeyAuthHook(apiKeyService: ApiKeyService) {
  return async function apiKeyAuth(request: FastifyRequest, _reply: FastifyReply) {
    const apiKey = request.headers['x-api-key'];
    if (typeof apiKey !== 'string' || !apiKey.startsWith('dfk_')) {
      throw AppError.unauthorized('Missing or invalid API key');
    }

    const resolved = await apiKeyService.resolve(apiKey);
    if (!resolved) {
      throw AppError.unauthorized('Invalid, revoked, or expired API key');
    }

    request.currentUser = {
      id: resolved.id,
      tenantId: resolved.tenantId,
      role: 'MEMBER',
      email: '',
      authMethod: 'api-key',
    };
  };
}
