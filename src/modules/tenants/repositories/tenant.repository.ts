import type { PrismaClient, Tenant } from '@prisma/client';

export class TenantRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string): Promise<Tenant | null> {
    return this.db.tenant.findUnique({ where: { id } });
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.db.tenant.findUnique({ where: { slug } });
  }

  async findMany(page: number, limit: number) {
    const [data, total] = await Promise.all([
      this.db.tenant.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.tenant.count(),
    ]);
    return { data, total };
  }

  async create(data: { name: string; slug: string; plan?: Tenant['plan'] }): Promise<Tenant> {
    return this.db.tenant.create({ data });
  }

  async update(
    id: string,
    data: Partial<Pick<Tenant, 'name' | 'plan' | 'isActive'>>,
  ): Promise<Tenant> {
    return this.db.tenant.update({ where: { id }, data });
  }
}
