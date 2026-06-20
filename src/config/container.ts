import type { PrismaClient } from '@prisma/client';
import type IORedis from 'ioredis';
import type { FastifyBaseLogger } from 'fastify';
import type { Env } from './env.js';
import { PasswordService } from '../modules/auth/services/password.service.js';
import { JwtService } from '../modules/auth/services/jwt.service.js';
import { ApiKeyService } from '../modules/auth/services/api-key.service.js';
import { AuthService } from '../modules/auth/services/auth.service.js';
import { AuthController } from '../modules/auth/controllers/auth.controller.js';
import { TenantRepository } from '../modules/tenants/repositories/tenant.repository.js';
import { TenantService } from '../modules/tenants/services/tenant.service.js';
import { TenantController } from '../modules/tenants/controllers/tenant.controller.js';
import { UserRepository } from '../modules/users/repositories/user.repository.js';
import { UserService } from '../modules/users/services/user.service.js';
import { UserController } from '../modules/users/controllers/user.controller.js';
import { StorageService } from '../infrastructure/storage/s3.js';
import { DocumentRepository } from '../modules/documents/repositories/document.repository.js';
import { DocumentService } from '../modules/documents/services/document.service.js';
import { DocumentController } from '../modules/documents/controllers/document.controller.js';
import { ProcessingService } from '../modules/processing/services/processing.service.js';
import { ClaudeService } from '../infrastructure/ai/claude.service.js';
import { WebhookService } from '../modules/webhooks/services/webhook.service.js';
import { WebhookController } from '../modules/webhooks/controllers/webhook.controller.js';
import { AuditService } from '../modules/audit/services/audit.service.js';

export interface Container {
  passwordService: PasswordService;
  jwtService: JwtService;
  apiKeyService: ApiKeyService;
  authService: AuthService;
  authController: AuthController;
  tenantController: TenantController;
  userController: UserController;
  storageService: StorageService;
  documentService: DocumentService;
  documentController: DocumentController;
  processingService: ProcessingService;
  claudeService: ClaudeService;
  webhookService: WebhookService;
  webhookController: WebhookController;
  auditService: AuditService;
}

export function createContainer(env: Env, db: PrismaClient, redis?: IORedis, logger?: FastifyBaseLogger): Container {
  const passwordService = new PasswordService(env.API_KEY_HASH_ROUNDS);
  const jwtService = new JwtService(env.JWT_SECRET, env.JWT_EXPIRES_IN);
  const apiKeyService = new ApiKeyService(db, passwordService);
  const authService = new AuthService(db, jwtService, passwordService);
  const authController = new AuthController(authService, apiKeyService);

  const tenantRepo = new TenantRepository(db);
  const tenantService = new TenantService(tenantRepo);
  const tenantController = new TenantController(tenantService);

  const userRepo = new UserRepository(db);
  const userService = new UserService(userRepo);
  const userController = new UserController(userService);

  const storageService = new StorageService({
    endpoint: env.S3_ENDPOINT,
    accessKey: env.S3_ACCESS_KEY,
    secretKey: env.S3_SECRET_KEY,
    bucket: env.S3_BUCKET,
    region: env.S3_REGION,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
  });

  const documentRepo = new DocumentRepository(db);
  const documentService = new DocumentService(documentRepo, storageService);
  const documentController = new DocumentController(documentService);

  const claudeService = new ClaudeService(env);

  const dummyLogger = (logger ?? console) as FastifyBaseLogger;
  const webhookService = new WebhookService(db, dummyLogger);
  const webhookController = new WebhookController(db);
  const auditService = new AuditService(db);

  const processingService = redis
    ? new ProcessingService(db, redis)
    : (undefined as unknown as ProcessingService);

  if (processingService) {
    documentService.setProcessingService(processingService);
  }

  return {
    passwordService,
    jwtService,
    apiKeyService,
    authService,
    authController,
    tenantController,
    userController,
    storageService,
    documentService,
    documentController,
    processingService,
    claudeService,
    webhookService,
    webhookController,
    auditService,
  };
}
