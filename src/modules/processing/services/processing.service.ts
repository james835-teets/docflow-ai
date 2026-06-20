import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import type IORedis from 'ioredis';

export const DOCUMENT_QUEUE_NAME = 'document-processing';

export interface ProcessingJobData {
  documentId: string;
  tenantId: string;
  storageKey: string;
  idempotencyKey: string;
}

export class ProcessingService {
  private readonly queue: Queue<ProcessingJobData>;

  constructor(
    private readonly db: PrismaClient,
    redis: IORedis,
  ) {
    // BullMQ bundles its own ioredis types — safe to cast
    this.queue = new Queue(DOCUMENT_QUEUE_NAME, { connection: redis as never });
  }

  async enqueue(documentId: string, tenantId: string, storageKey: string): Promise<string> {
    const idempotencyKey = `doc:${documentId}:${randomUUID().slice(0, 8)}`;

    const job = await this.db.processingJob.create({
      data: { documentId, idempotencyKey },
    });

    await this.queue.add(
      'process-document',
      { documentId, tenantId, storageKey, idempotencyKey },
      {
        jobId: job.id,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    );

    await this.db.document.update({
      where: { id: documentId },
      data: { status: 'PROCESSING' },
    });

    return job.id;
  }

  async getJobStatus(documentId: string) {
    return this.db.processingJob.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
  }

  async close() {
    await this.queue.close();
  }
}
