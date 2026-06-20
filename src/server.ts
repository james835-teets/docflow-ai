import { env } from './config/env.js';
import { buildApp } from './app.js';
import { getPrismaClient, disconnectPrisma } from './infrastructure/database/prisma.js';
import { getRedisClient, disconnectRedis } from './infrastructure/queue/redis.js';

const db = getPrismaClient();
const redis = getRedisClient(env.REDIS_URL);
const { app } = buildApp(env, db, redis);

async function start() {
  try {
    await app.listen({ port: env.PORT, host: env.HOST });
  } catch (err) {
    app.log.fatal(err, 'Failed to start server');
    process.exit(1);
  }
}

async function shutdown(signal: string) {
  app.log.info(`Received ${signal}, shutting down gracefully…`);
  await app.close();
  await disconnectPrisma();
  await disconnectRedis();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

void start();
