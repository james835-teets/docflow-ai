import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { UserController } from '../controllers/user.controller.js';
import { requireRole, requireMinRole } from '../../../shared/middleware/rbac.js';

interface UserRouteDeps {
  userController: UserController;
  jwtAuthHook: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
}

export function registerUserRoutes(app: FastifyInstance, deps: UserRouteDeps) {
  const { userController, jwtAuthHook } = deps;

  app.get('/users', { preHandler: [jwtAuthHook, requireMinRole('MEMBER')] }, (req, reply) =>
    userController.list(req, reply),
  );

  app.get('/users/:id', { preHandler: [jwtAuthHook, requireMinRole('MEMBER')] }, (req, reply) =>
    userController.getById(req, reply),
  );

  app.patch('/users/:id', { preHandler: [jwtAuthHook, requireRole('ADMIN')] }, (req, reply) =>
    userController.update(req, reply),
  );

  app.delete('/users/:id', { preHandler: [jwtAuthHook, requireRole('ADMIN')] }, (req, reply) =>
    userController.delete(req, reply),
  );
}
