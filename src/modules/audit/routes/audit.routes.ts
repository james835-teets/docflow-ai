import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { AuditService } from '../services/audit.service.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { paginated } from '../../../shared/types/api.js';
import { requireRole } from '../../../shared/middleware/rbac.js';

const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  action: z.string().optional(),
});

interface AuditRouteDeps {
  auditService: AuditService;
  jwtAuthHook: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
}

export function registerAuditRoutes(app: FastifyInstance, deps: AuditRouteDeps) {
  app.get(
    '/audit-logs',
    { preHandler: [deps.jwtAuthHook, requireRole('ADMIN')] },
    async (req, reply) => {
      const user = req.currentUser;
      if (!user) throw AppError.unauthorized();
      const { page, limit, action } = auditQuerySchema.parse(req.query);
      const { data, total } = await deps.auditService.list(user.tenantId, page, limit, action);
      return reply.send(paginated(data, total, page, limit));
    },
  );
}
