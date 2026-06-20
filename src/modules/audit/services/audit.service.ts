import type { Prisma, PrismaClient } from '@prisma/client';

export interface AuditEntry {
  tenantId: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  constructor(private readonly db: PrismaClient) {}

  async log(entry: AuditEntry): Promise<void> {
    await this.db.auditLog.create({ data: entry });
  }

  async list(tenantId: string, page: number, limit: number, action?: string) {
    const where = { tenantId, ...(action && { action }) };
    const [data, total] = await Promise.all([
      this.db.auditLog.findMany({
        where,
        include: { user: { select: { email: true, name: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.auditLog.count({ where }),
    ]);
    return { data, total };
  }
}
