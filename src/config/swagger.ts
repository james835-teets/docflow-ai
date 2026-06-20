import type { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

export async function registerSwagger(app: FastifyInstance) {
  await app.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'DocFlow AI API',
        description:
          'Enterprise Document Intelligence Platform — Multi-tenant SaaS for AI-powered document analysis',
        version: '0.1.0',
        contact: { name: 'DocFlow AI', email: 'support@docflow.ai' },
      },
      servers: [{ url: 'http://localhost:3000', description: 'Development' }],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT token from /auth/login',
          },
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'x-api-key',
            description: 'API key (dfk_...)',
          },
        },
      },
      tags: [
        { name: 'Auth', description: 'Authentication and API keys' },
        { name: 'Tenants', description: 'Tenant management' },
        { name: 'Users', description: 'User management (tenant-scoped)' },
        { name: 'Documents', description: 'Document upload and management' },
        { name: 'Webhooks', description: 'Webhook endpoint management' },
        { name: 'Audit', description: 'Audit log' },
        { name: 'System', description: 'Health checks and metrics' },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });
}
