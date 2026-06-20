import type { FastifyReply, FastifyRequest } from 'fastify';
import { ok } from '../../../shared/types/api.js';
import { AppError } from '../../../shared/errors/app-error.js';
import type { AuthService } from '../services/auth.service.js';
import type { ApiKeyService } from '../services/api-key.service.js';
import { registerSchema, loginSchema, createApiKeySchema } from '../schemas.js';

export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly apiKeyService: ApiKeyService,
  ) {}

  async register(request: FastifyRequest, reply: FastifyReply) {
    const input = registerSchema.parse(request.body);
    const result = await this.authService.register(input);
    return reply.status(201).send(ok(result));
  }

  async login(request: FastifyRequest, reply: FastifyReply) {
    const input = loginSchema.parse(request.body);
    const result = await this.authService.login(input);
    return reply.send(ok(result));
  }

  async me(request: FastifyRequest, reply: FastifyReply) {
    const user = request.currentUser;
    if (!user) throw AppError.unauthorized();
    return reply.send(ok(user));
  }

  async createApiKey(request: FastifyRequest, reply: FastifyReply) {
    const user = request.currentUser;
    if (!user) throw AppError.unauthorized();

    const input = createApiKeySchema.parse(request.body);
    const apiKey = await this.apiKeyService.create(
      user.tenantId,
      input.name,
      input.permissions,
    );
    return reply.status(201).send(ok(apiKey));
  }

  async listApiKeys(request: FastifyRequest, reply: FastifyReply) {
    const user = request.currentUser;
    if (!user) throw AppError.unauthorized();

    const keys = await this.apiKeyService.listByTenant(user.tenantId);
    return reply.send(ok(keys));
  }

  async revokeApiKey(request: FastifyRequest, reply: FastifyReply) {
    const user = request.currentUser;
    if (!user) throw AppError.unauthorized();

    const { id } = request.params as { id: string };
    const revoked = await this.apiKeyService.revoke(id, user.tenantId);

    if (!revoked) {
      throw AppError.notFound('API key');
    }

    return reply.send(ok({ revoked: true }));
  }
}
