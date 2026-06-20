import { AppError } from '../../../shared/errors/app-error.js';
import type { TenantRepository } from '../repositories/tenant.repository.js';

export class TenantService {
  constructor(private readonly repo: TenantRepository) {}

  async getById(id: string) {
    const tenant = await this.repo.findById(id);
    if (!tenant) throw AppError.notFound('Tenant');
    return tenant;
  }

  async list(page: number, limit: number) {
    return this.repo.findMany(page, limit);
  }

  async create(data: { name: string; slug: string; plan?: 'FREE' | 'STARTER' | 'BUSINESS' | 'ENTERPRISE' }) {
    const existing = await this.repo.findBySlug(data.slug);
    if (existing) throw AppError.conflict('Tenant with this slug already exists');
    return this.repo.create(data);
  }

  async update(id: string, data: { name?: string; plan?: 'FREE' | 'STARTER' | 'BUSINESS' | 'ENTERPRISE'; isActive?: boolean }) {
    await this.getById(id);
    return this.repo.update(id, data);
  }
}
