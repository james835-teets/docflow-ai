import type { PrismaClient } from '@prisma/client';

const USER_SELECT = {
  id: true,
  tenantId: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class UserRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string, tenantId: string) {
    return this.db.user.findFirst({
      where: { id, tenantId },
      select: USER_SELECT,
    });
  }

  async findMany(tenantId: string, page: number, limit: number) {
    const [data, total] = await Promise.all([
      this.db.user.findMany({
        where: { tenantId },
        select: USER_SELECT,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.user.count({ where: { tenantId } }),
    ]);
    return { data, total };
  }

  async update(id: string, tenantId: string, data: { name?: string; role?: 'ADMIN' | 'MEMBER' | 'VIEWER'; isActive?: boolean }) {
    return this.db.user.update({
      where: { id, tenantId },
      select: USER_SELECT,
      data,
    });
  }

  async delete(id: string, tenantId: string) {
    const result = await this.db.user.deleteMany({ where: { id, tenantId } });
    return result.count > 0;
  }
}
