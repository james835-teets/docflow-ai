import { randomBytes } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import type { PasswordService } from './password.service.js';

export interface ApiKeyWithPlaintext {
  id: string;
  name: string;
  keyPrefix: string;
  plainTextKey: string;
  permissions: string[];
}

export interface ResolvedApiKey {
  id: string;
  tenantId: string;
  permissions: string[];
}

export class ApiKeyService {
  constructor(
    private readonly db: PrismaClient,
    private readonly passwordService: PasswordService,
  ) {}

  async create(
    tenantId: string,
    name: string,
    permissions: string[] = ['read', 'write'],
  ): Promise<ApiKeyWithPlaintext> {
    const plainTextKey = `dfk_${randomBytes(32).toString('hex')}`;
    const keyPrefix = plainTextKey.slice(0, 11);
    const keyHash = await this.passwordService.hash(plainTextKey);

    const apiKey = await this.db.apiKey.create({
      data: { tenantId, name, keyPrefix, keyHash, permissions },
    });

    return {
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      plainTextKey,
      permissions: apiKey.permissions,
    };
  }

  async resolve(plainTextKey: string): Promise<ResolvedApiKey | null> {
    const prefix = plainTextKey.slice(0, 11);

    const candidates = await this.db.apiKey.findMany({
      where: {
        keyPrefix: prefix,
        isRevoked: false,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: { tenant: { select: { isActive: true } } },
    });

    for (const candidate of candidates) {
      if (!candidate.tenant.isActive) continue;

      const matches = await this.passwordService.verify(plainTextKey, candidate.keyHash);
      if (matches) {
        await this.db.apiKey.update({
          where: { id: candidate.id },
          data: { lastUsedAt: new Date() },
        });

        return {
          id: candidate.id,
          tenantId: candidate.tenantId,
          permissions: candidate.permissions,
        };
      }
    }

    return null;
  }

  async revoke(id: string, tenantId: string): Promise<boolean> {
    const result = await this.db.apiKey.updateMany({
      where: { id, tenantId },
      data: { isRevoked: true },
    });
    return result.count > 0;
  }

  async listByTenant(tenantId: string) {
    return this.db.apiKey.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        lastUsedAt: true,
        expiresAt: true,
        isRevoked: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
