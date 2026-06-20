import { createHmac } from 'node:crypto';
import type { Prisma, PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';

export class WebhookService {
  constructor(
    private readonly db: PrismaClient,
    private readonly logger: FastifyBaseLogger,
  ) {}

  async deliver(tenantId: string, event: string, payload: Record<string, unknown>) {
    const endpoints = await this.db.webhookEndpoint.findMany({
      where: { tenantId, isActive: true, events: { has: event } },
    });

    await Promise.allSettled(
      endpoints.map((endpoint) => this.sendToEndpoint(endpoint, event, payload)),
    );
  }

  private async sendToEndpoint(
    endpoint: { id: string; url: string; secret: string },
    event: string,
    payload: Record<string, unknown>,
  ) {
    const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });
    const signature = this.sign(body, endpoint.secret);

    let responseStatus: number | null = null;
    let responseBody: string | null = null;

    try {
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DocFlow-Signature': `sha256=${signature}`,
          'X-DocFlow-Event': event,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });

      responseStatus = response.status;
      responseBody = await response.text().catch(() => null);
    } catch (err) {
      this.logger.warn({ endpointId: endpoint.id, err }, 'Webhook delivery failed');
      responseBody = err instanceof Error ? err.message : 'Unknown error';
    }

    await this.db.webhookDelivery.create({
      data: {
        endpointId: endpoint.id,
        event,
        payload: payload as Prisma.InputJsonValue,
        responseStatus,
        responseBody,
        deliveredAt: responseStatus != null ? new Date() : null,
      },
    });
  }

  private sign(payload: string, secret: string): string {
    return createHmac('sha256', secret).update(payload).digest('hex');
  }
}
