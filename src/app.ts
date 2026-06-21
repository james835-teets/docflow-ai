import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import type { PrismaClient } from '@prisma/client';
import type IORedis from 'ioredis';
import type { Env } from './config/env.js';
import { createContainer } from './config/container.js';
import { createLoggerConfig } from './shared/logging/logger.js';
import { createErrorHandler } from './shared/errors/error-handler.js';
import { correlationIdHook } from './shared/middleware/correlation-id.js';
import { createJwtAuthHook } from './shared/middleware/jwt-auth.js';
import { createCombinedAuthHook } from './shared/middleware/combined-auth.js';
import { ok } from './shared/types/api.js';
import { registerAuthRoutes } from './modules/auth/routes/auth.routes.js';
import { registerTenantRoutes } from './modules/tenants/routes/tenant.routes.js';
import { registerUserRoutes } from './modules/users/routes/user.routes.js';
import { registerDocumentRoutes } from './modules/documents/routes/document.routes.js';
import { registerWebhookRoutes } from './modules/webhooks/routes/webhook.routes.js';
import { registerAuditRoutes } from './modules/audit/routes/audit.routes.js';
import { registerSwagger } from './config/swagger.js';
import './shared/types/request.js';

export function buildApp(env: Env, db: PrismaClient, redis?: IORedis) {
  const app = Fastify({
    logger: env.NODE_ENV === 'test' ? false : createLoggerConfig(env.LOG_LEVEL),
    genReqId: () => crypto.randomUUID(),
  });

  const container = createContainer(env, db, redis, app.log);

  void app.register(cors, { origin: true });
  void app.register(helmet, { contentSecurityPolicy: env.NODE_ENV === 'production' });

  if (env.NODE_ENV !== 'test') {
    void registerSwagger(app);
  }
  void app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } });

  if (env.NODE_ENV !== 'test') {
    void app.register(rateLimit, {
      max: env.RATE_LIMIT_MAX,
      timeWindow: env.RATE_LIMIT_WINDOW_MS,
    });
  }

  app.addHook('onRequest', correlationIdHook);
  app.setErrorHandler(createErrorHandler(app.log) as Parameters<typeof app.setErrorHandler>[0]);

  app.get('/', async (_request, reply) => {
    return reply.send(ok({
      name: 'DocFlow AI',
      version: process.env['npm_package_version'] ?? '0.1.0',
      docs: '/docs',
      health: '/health',
    }));
  });

  app.get('/health', async (_request, reply) => {
    const response = ok({
      status: 'healthy',
      version: process.env['npm_package_version'] ?? '0.1.0',
      uptime: process.uptime(),
    });
    return reply.send(response);
  });

  const jwtAuthHook = createJwtAuthHook(container.jwtService);
  const combinedAuthHook = createCombinedAuthHook(container.jwtService, container.apiKeyService);

  registerAuthRoutes(app, { authController: container.authController, jwtAuthHook });
  registerTenantRoutes(app, { tenantController: container.tenantController, jwtAuthHook });
  registerUserRoutes(app, { userController: container.userController, jwtAuthHook });
  registerDocumentRoutes(app, {
    documentController: container.documentController,
    combinedAuthHook,
  });
  registerWebhookRoutes(app, { webhookController: container.webhookController, jwtAuthHook });
  registerAuditRoutes(app, { auditService: container.auditService, jwtAuthHook });

  return { app, container };
}
