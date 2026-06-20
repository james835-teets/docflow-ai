import type { FastifyReply, FastifyRequest } from 'fastify';
import { ok, paginated } from '../../../shared/types/api.js';
import type { TenantService } from '../services/tenant.service.js';
import { createTenantSchema, updateTenantSchema, paginationSchema } from '../schemas.js';

export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  async create(request: FastifyRequest, reply: FastifyReply) {
    const input = createTenantSchema.parse(request.body);
    const tenant = await this.tenantService.create(input);
    return reply.status(201).send(ok(tenant));
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const tenant = await this.tenantService.getById(id);
    return reply.send(ok(tenant));
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const { page, limit } = paginationSchema.parse(request.query);
    const { data, total } = await this.tenantService.list(page, limit);
    return reply.send(paginated(data, total, page, limit));
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const input = updateTenantSchema.parse(request.body);
    const tenant = await this.tenantService.update(id, input);
    return reply.send(ok(tenant));
  }
}
