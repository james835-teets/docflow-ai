import { z } from 'zod';

export const registerSchema = z.object({
  tenantId: z.string().uuid(),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(255),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).optional(),
});

export const loginSchema = z.object({
  tenantId: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(1),
});

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(255),
  permissions: z.array(z.enum(['read', 'write'])).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
