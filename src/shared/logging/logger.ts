import type { PinoLoggerOptions } from 'fastify/types/logger.js';

export function createLoggerConfig(level: string): PinoLoggerOptions {
  return {
    level,
    ...(process.env['NODE_ENV'] === 'development' && {
      transport: { target: 'pino-pretty', options: { colorize: true } },
    }),
    redact: ['req.headers.authorization', 'req.headers["x-api-key"]'],
  };
}
