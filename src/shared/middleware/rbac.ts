import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../errors/app-error.js';

type Role = 'ADMIN' | 'MEMBER' | 'VIEWER';

const ROLE_HIERARCHY: Record<Role, number> = {
  VIEWER: 0,
  MEMBER: 1,
  ADMIN: 2,
};

export function requireRole(...allowedRoles: Role[]) {
  return async function rbacCheck(request: FastifyRequest, _reply: FastifyReply) {
    const user = request.currentUser;
    if (!user) {
      throw AppError.unauthorized();
    }

    const userRole = user.role as Role;
    if (!allowedRoles.includes(userRole)) {
      throw AppError.forbidden(
        `Role '${userRole}' is not authorized. Required: ${allowedRoles.join(' or ')}`,
      );
    }
  };
}

export function requireMinRole(minRole: Role) {
  return async function rbacMinCheck(request: FastifyRequest, _reply: FastifyReply) {
    const user = request.currentUser;
    if (!user) {
      throw AppError.unauthorized();
    }

    const userLevel = ROLE_HIERARCHY[user.role as Role] ?? -1;
    const requiredLevel = ROLE_HIERARCHY[minRole];

    if (userLevel < requiredLevel) {
      throw AppError.forbidden(
        `Insufficient permissions. Minimum role required: ${minRole}`,
      );
    }
  };
}
