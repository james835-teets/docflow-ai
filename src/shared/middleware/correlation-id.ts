import { randomUUID } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';

export async function correlationIdHook(request: FastifyRequest, reply: FastifyReply) {
  const existing = request.headers['x-correlation-id'];
  const correlationId = typeof existing === 'string' ? existing : randomUUID();

  request.headers['x-correlation-id'] = correlationId;
  void reply.header('x-correlation-id', correlationId);

  request.log = request.log.child({ correlationId });
}
