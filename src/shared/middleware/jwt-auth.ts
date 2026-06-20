import type { FastifyReply, FastifyRequest } from 'fastify';
import type { JwtService } from '../../modules/auth/services/jwt.service.js';
import { AppError } from '../errors/app-error.js';

export function createJwtAuthHook(jwtService: JwtService) {
  return async function jwtAuth(request: FastifyRequest, _reply: FastifyReply) {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw AppError.unauthorized('Missing or invalid Authorization header');
    }

    const token = header.slice(7);

    try {
      const payload = jwtService.verify(token);
      request.currentUser = {
        id: payload.sub,
        tenantId: payload.tenantId,
        role: payload.role,
        email: payload.email,
        authMethod: 'jwt',
      };
    } catch {
      throw AppError.unauthorized('Invalid or expired token');
    }
  };
}
