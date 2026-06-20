export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  role: string;
  email: string;
  authMethod: 'jwt' | 'api-key';
}

declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: AuthenticatedUser;
  }
}
