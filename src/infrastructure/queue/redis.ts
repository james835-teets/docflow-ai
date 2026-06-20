import IORedis from 'ioredis';

let redis: IORedis | undefined;

export function getRedisClient(url: string): IORedis {
  if (!redis) {
    redis = new IORedis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });
  }
  return redis;
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = undefined;
  }
}
