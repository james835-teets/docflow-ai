import type { FastifyReply, FastifyRequest } from 'fastify';
import { ok, paginated } from '../../../shared/types/api.js';
import { AppError } from '../../../shared/errors/app-error.js';
import type { UserService } from '../services/user.service.js';
import { updateUserSchema } from '../schemas.js';
import { paginationSchema } from '../../tenants/schemas.js';

export class UserController {
  constructor(private readonly userService: UserService) {}

  async list(request: FastifyRequest, reply: FastifyReply) {
    const user = request.currentUser;
    if (!user) throw AppError.unauthorized();
    const { page, limit } = paginationSchema.parse(request.query);
    const { data, total } = await this.userService.list(user.tenantId, page, limit);
    return reply.send(paginated(data, total, page, limit));
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const user = request.currentUser;
    if (!user) throw AppError.unauthorized();
    const { id } = request.params as { id: string };
    const found = await this.userService.getById(id, user.tenantId);
    return reply.send(ok(found));
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const user = request.currentUser;
    if (!user) throw AppError.unauthorized();
    const { id } = request.params as { id: string };
    const input = updateUserSchema.parse(request.body);
    const updated = await this.userService.update(id, user.tenantId, input);
    return reply.send(ok(updated));
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const user = request.currentUser;
    if (!user) throw AppError.unauthorized();
    const { id } = request.params as { id: string };
    await this.userService.delete(id, user.tenantId);
    return reply.status(204).send();
  }
}
