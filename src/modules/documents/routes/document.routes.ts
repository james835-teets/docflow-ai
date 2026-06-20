import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { DocumentController } from '../controllers/document.controller.js';
import { requireMinRole } from '../../../shared/middleware/rbac.js';

interface DocumentRouteDeps {
  documentController: DocumentController;
  combinedAuthHook: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
}

export function registerDocumentRoutes(app: FastifyInstance, deps: DocumentRouteDeps) {
  const { documentController, combinedAuthHook } = deps;

  app.post(
    '/documents',
    { preHandler: [combinedAuthHook, requireMinRole('MEMBER')] },
    (req, reply) => documentController.upload(req, reply),
  );

  app.get('/documents', { preHandler: [combinedAuthHook] }, (req, reply) =>
    documentController.list(req, reply),
  );

  app.get('/documents/:id', { preHandler: [combinedAuthHook] }, (req, reply) =>
    documentController.getById(req, reply),
  );

  app.get('/documents/:id/download', { preHandler: [combinedAuthHook] }, (req, reply) =>
    documentController.getDownloadUrl(req, reply),
  );
}
