import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { TenantController } from '../controllers/tenant.controller.js';
import { requireRole } from '../../../shared/middleware/rbac.js';

interface TenantRouteDeps {
  tenantController: TenantController;
  jwtAuthHook: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
}

export function registerTenantRoutes(app: FastifyInstance, deps: TenantRouteDeps) {
  const { tenantController, jwtAuthHook } = deps;

  app.post(
    '/tenants',
    (req, reply) => tenantController.create(req, reply),
  );

  app.get(
    '/tenants',
    { preHandler: [jwtAuthHook, requireRole('ADMIN')] },
    (req, reply) => tenantController.list(req, reply),
  );

  app.get(
    '/tenants/:id',
    { preHandler: [jwtAuthHook] },
    (req, reply) => tenantController.getById(req, reply),
  );

  app.patch(
    '/tenants/:id',
    { preHandler: [jwtAuthHook, requireRole('ADMIN')] },
    (req, reply) => tenantController.update(req, reply),
  );
}
