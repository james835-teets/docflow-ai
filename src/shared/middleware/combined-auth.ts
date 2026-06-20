import type { FastifyReply, FastifyRequest } from 'fastify';
import type { JwtService } from '../../modules/auth/services/jwt.service.js';
import type { ApiKeyService } from '../../modules/auth/services/api-key.service.js';
import { createJwtAuthHook } from './jwt-auth.js';
import { createApiKeyAuthHook } from './api-key-auth.js';
import { AppError } from '../errors/app-error.js';

export function createCombinedAuthHook(jwtService: JwtService, apiKeyService: ApiKeyService) {
  const jwtAuth = createJwtAuthHook(jwtService);
  const apiKeyAuth = createApiKeyAuthHook(apiKeyService);

  return async function combinedAuth(request: FastifyRequest, reply: FastifyReply) {
    if (request.headers['x-api-key']) {
      return apiKeyAuth(request, reply);
    }

    if (request.headers.authorization) {
      return jwtAuth(request, reply);
    }

    throw AppError.unauthorized('No authentication credentials provided');
  };
}
