import { PrismaClient } from '@prisma/client';
import { buildApp } from '../../src/app.js';

const TEST_ENV = {
  NODE_ENV: 'test' as const,
  PORT: 0,
  HOST: '127.0.0.1',
  LOG_LEVEL: 'fatal' as const,
  DATABASE_URL:
    process.env['DATABASE_URL'] ??
    'postgresql://docflow:docflow_dev@localhost:5433/docflow?schema=public',
  REDIS_URL: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
  S3_ENDPOINT: 'http://localhost:9000',
  S3_ACCESS_KEY: 'minioadmin',
  S3_SECRET_KEY: 'minioadmin',
  S3_BUCKET: 'test-bucket',
  S3_REGION: 'us-east-1',
  S3_FORCE_PATH_STYLE: true,
  JWT_SECRET: 'test-jwt-secret-that-is-absolutely-long-enough-for-validation',
  JWT_EXPIRES_IN: '1h',
  API_KEY_HASH_ROUNDS: 4,
  ANTHROPIC_API_KEY: 'sk-ant-test-key-not-real',
  ANTHROPIC_MODEL: 'claude-sonnet-4-20250514',
  ANTHROPIC_MAX_RETRIES: 1,
  ANTHROPIC_TIMEOUT_MS: 5000,
  WEBHOOK_SIGNING_SECRET: 'test-webhook-secret',
  RATE_LIMIT_MAX: 1000,
  RATE_LIMIT_WINDOW_MS: 60000,
};

export function createTestApp() {
  const db = new PrismaClient({
    datasourceUrl: TEST_ENV.DATABASE_URL,
    log: [],
  });

  const { app } = buildApp(TEST_ENV, db);

  return { app, db };
}

export async function cleanDatabase(db: PrismaClient) {
  await db.$transaction([
    db.webhookDelivery.deleteMany(),
    db.webhookEndpoint.deleteMany(),
    db.auditLog.deleteMany(),
    db.extractedData.deleteMany(),
    db.processingJob.deleteMany(),
    db.document.deleteMany(),
    db.apiKey.deleteMany(),
    db.user.deleteMany(),
    db.tenant.deleteMany(),
  ]);
}
