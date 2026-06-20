import type { FastifyInstance } from 'fastify';
import type { AuthController } from '../controllers/auth.controller.js';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { requireRole } from '../../../shared/middleware/rbac.js';

interface AuthRouteDeps {
  authController: AuthController;
  jwtAuthHook: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
}

export function registerAuthRoutes(app: FastifyInstance, deps: AuthRouteDeps) {
  const { authController, jwtAuthHook } = deps;

  app.post('/auth/register', (req, reply) => authController.register(req, reply));
  app.post('/auth/login', (req, reply) => authController.login(req, reply));

  app.get(
    '/auth/me',
    { preHandler: [jwtAuthHook] },
    (req, reply) => authController.me(req, reply),
  );

  app.post(
    '/auth/api-keys',
    { preHandler: [jwtAuthHook, requireRole('ADMIN')] },
    (req, reply) => authController.createApiKey(req, reply),
  );

  app.get(
    '/auth/api-keys',
    { preHandler: [jwtAuthHook, requireRole('ADMIN', 'MEMBER')] },
    (req, reply) => authController.listApiKeys(req, reply),
  );

  app.delete(
    '/auth/api-keys/:id',
    { preHandler: [jwtAuthHook, requireRole('ADMIN')] },
    (req, reply) => authController.revokeApiKey(req, reply),
  );
}
