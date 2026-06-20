import type { PrismaClient } from '@prisma/client';
import { AppError } from '../../../shared/errors/app-error.js';
import type { JwtService } from './jwt.service.js';
import type { PasswordService } from './password.service.js';

export interface RegisterInput {
  tenantId: string;
  email: string;
  password: string;
  name: string;
  role?: 'ADMIN' | 'MEMBER' | 'VIEWER';
}

export interface LoginInput {
  tenantId: string;
  email: string;
  password: string;
}

export interface AuthResult {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
  };
}

export class AuthService {
  constructor(
    private readonly db: PrismaClient,
    private readonly jwtService: JwtService,
    private readonly passwordService: PasswordService,
  ) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    const existing = await this.db.user.findUnique({
      where: { tenantId_email: { tenantId: input.tenantId, email: input.email } },
    });

    if (existing) {
      throw AppError.conflict('User with this email already exists in this tenant');
    }

    const tenant = await this.db.tenant.findUnique({
      where: { id: input.tenantId },
    });

    if (!tenant?.isActive) {
      throw AppError.badRequest('Tenant not found or inactive');
    }

    const passwordHash = await this.passwordService.hash(input.password);

    const user = await this.db.user.create({
      data: {
        tenantId: input.tenantId,
        email: input.email,
        passwordHash,
        name: input.name,
        role: input.role ?? 'MEMBER',
      },
    });

    const token = this.jwtService.sign({
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.db.user.findUnique({
      where: { tenantId_email: { tenantId: input.tenantId, email: input.email } },
      include: { tenant: { select: { isActive: true } } },
    });

    if (!user || !user.isActive || !user.tenant.isActive) {
      throw AppError.unauthorized('Invalid credentials');
    }

    const valid = await this.passwordService.verify(input.password, user.passwordHash);
    if (!valid) {
      throw AppError.unauthorized('Invalid credentials');
    }

    await this.db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = this.jwtService.sign({
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }
}
