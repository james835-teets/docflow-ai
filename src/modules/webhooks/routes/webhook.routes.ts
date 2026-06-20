import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { WebhookController } from '../controllers/webhook.controller.js';
import { requireRole } from '../../../shared/middleware/rbac.js';

interface WebhookRouteDeps {
  webhookController: WebhookController;
  jwtAuthHook: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
}

export function registerWebhookRoutes(app: FastifyInstance, deps: WebhookRouteDeps) {
  const { webhookController, jwtAuthHook } = deps;

  app.post('/webhooks', { preHandler: [jwtAuthHook, requireRole('ADMIN')] }, (req, reply) =>
    webhookController.create(req, reply),
  );

  app.get(
    '/webhooks',
    { preHandler: [jwtAuthHook, requireRole('ADMIN', 'MEMBER')] },
    (req, reply) => webhookController.list(req, reply),
  );

  app.patch('/webhooks/:id', { preHandler: [jwtAuthHook, requireRole('ADMIN')] }, (req, reply) =>
    webhookController.update(req, reply),
  );

  app.delete('/webhooks/:id', { preHandler: [jwtAuthHook, requireRole('ADMIN')] }, (req, reply) =>
    webhookController.delete(req, reply),
  );
}
