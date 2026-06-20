import { AppError } from '../../../shared/errors/app-error.js';
import type { UserRepository } from '../repositories/user.repository.js';

export class UserService {
  constructor(private readonly repo: UserRepository) {}

  async getById(id: string, tenantId: string) {
    const user = await this.repo.findById(id, tenantId);
    if (!user) throw AppError.notFound('User');
    return user;
  }

  async list(tenantId: string, page: number, limit: number) {
    return this.repo.findMany(tenantId, page, limit);
  }

  async update(id: string, tenantId: string, data: { name?: string; role?: 'ADMIN' | 'MEMBER' | 'VIEWER'; isActive?: boolean }) {
    await this.getById(id, tenantId);
    return this.repo.update(id, tenantId, data);
  }

  async delete(id: string, tenantId: string) {
    const deleted = await this.repo.delete(id, tenantId);
    if (!deleted) throw AppError.notFound('User');
  }
}
