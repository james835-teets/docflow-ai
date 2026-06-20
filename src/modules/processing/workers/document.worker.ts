import { Worker, type Job } from 'bullmq';
import type IORedis from 'ioredis';
import type { Prisma, PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import type { ClaudeService } from '../../../infrastructure/ai/claude.service.js';
import type { StorageService } from '../../../infrastructure/storage/s3.js';
import { DOCUMENT_QUEUE_NAME, type ProcessingJobData } from '../services/processing.service.js';

export function createDocumentWorker(
  redis: IORedis,
  db: PrismaClient,
  claudeService: ClaudeService,
  storageService: StorageService,
  logger: FastifyBaseLogger,
) {
  const worker = new Worker<ProcessingJobData>(
    DOCUMENT_QUEUE_NAME,
    async (job: Job<ProcessingJobData>) => {
      const { documentId, idempotencyKey, storageKey } = job.data;

      const existingJob = await db.processingJob.findUnique({
        where: { idempotencyKey },
      });

      if (existingJob?.status === 'COMPLETED') {
        logger.info({ documentId, idempotencyKey }, 'Job already completed (idempotent skip)');
        return;
      }

      await db.processingJob.update({
        where: { idempotencyKey },
        data: { status: 'PROCESSING', startedAt: new Date(), attempts: { increment: 1 } },
      });

      try {
        const downloadUrl = await storageService.getSignedDownloadUrl(storageKey);
        const response = await fetch(downloadUrl);
        const buffer = Buffer.from(await response.arrayBuffer());
        const content = buffer.toString('utf-8');

        const result = await claudeService.extractDocumentData(content);

        const jsonEntities = result.entities as Prisma.InputJsonValue;
        const jsonMetadata = result.metadata as Prisma.InputJsonValue;

        await db.$transaction([
          db.extractedData.upsert({
            where: { documentId },
            create: {
              documentId,
              summary: result.summary,
              entities: jsonEntities,
              metadata: jsonMetadata,
              confidence: result.confidence,
              tokensUsed: result.tokensUsed,
              modelUsed: result.modelUsed,
            },
            update: {
              summary: result.summary,
              entities: jsonEntities,
              metadata: jsonMetadata,
              confidence: result.confidence,
              tokensUsed: result.tokensUsed,
              modelUsed: result.modelUsed,
            },
          }),
          db.document.update({
            where: { id: documentId },
            data: { status: 'COMPLETED', documentType: result.documentType },
          }),
          db.processingJob.update({
            where: { idempotencyKey },
            data: { status: 'COMPLETED', completedAt: new Date() },
          }),
        ]);

        logger.info({ documentId }, 'Document processing completed');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';

        await db.processingJob.update({
          where: { idempotencyKey },
          data: { status: 'FAILED', lastError: message },
        });

        if (job.attemptsMade >= (job.opts.attempts ?? 3) - 1) {
          await db.document.update({
            where: { id: documentId },
            data: { status: 'FAILED', processingError: message },
          });
        }

        throw error;
      }
    },
    {
      connection: redis as never,
      concurrency: 3,
      limiter: { max: 10, duration: 60_000 },
    },
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Document processing job failed');
  });

  return worker;
}
