import { randomBytes } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { ok } from '../../../shared/types/api.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { createWebhookSchema, updateWebhookSchema } from '../schemas.js';

export class WebhookController {
  constructor(private readonly db: PrismaClient) {}

  async create(request: FastifyRequest, reply: FastifyReply) {
    const user = request.currentUser;
    if (!user) throw AppError.unauthorized();

    const input = createWebhookSchema.parse(request.body);
    const secret = `whsec_${randomBytes(24).toString('hex')}`;

    const endpoint = await this.db.webhookEndpoint.create({
      data: { tenantId: user.tenantId, url: input.url, secret, events: input.events },
    });

    return reply.status(201).send(ok({ ...endpoint, secret }));
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const user = request.currentUser;
    if (!user) throw AppError.unauthorized();

    const endpoints = await this.db.webhookEndpoint.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true, url: true, events: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send(ok(endpoints));
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const user = request.currentUser;
    if (!user) throw AppError.unauthorized();
    const { id } = request.params as { id: string };
    const input = updateWebhookSchema.parse(request.body);

    const endpoint = await this.db.webhookEndpoint.updateMany({
      where: { id, tenantId: user.tenantId },
      data: input,
    });

    if (endpoint.count === 0) throw AppError.notFound('Webhook endpoint');
    return reply.send(ok({ updated: true }));
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const user = request.currentUser;
    if (!user) throw AppError.unauthorized();
    const { id } = request.params as { id: string };

    const result = await this.db.webhookEndpoint.deleteMany({
      where: { id, tenantId: user.tenantId },
    });

    if (result.count === 0) throw AppError.notFound('Webhook endpoint');
    return reply.status(204).send();
  }
}
