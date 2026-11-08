import type { FastifyReply, FastifyRequest } from 'fastify';

export type AdminAuthConfig = {
  /** Expected bearer token; empty means admin routes reject all callers. */
  adminToken: string;
};

export function requireAdminAuth(
  config: AdminAuthConfig,
): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
  return async (request, reply) => {
    const expected = config.adminToken.trim();
    if (expected.length === 0) {
      await reply.code(503).send({
        error: 'admin_unavailable',
        message: 'Admin API is not configured',
      });
      return;
    }
    const header = request.headers.authorization;
    if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
      await reply.code(401).send({
        error: 'unauthorized',
        message: 'Admin bearer token required',
      });
      return;
    }
    const provided = header.slice('Bearer '.length).trim();
    if (provided.length === 0 || provided !== expected) {
      await reply.code(403).send({
        error: 'forbidden',
        message: 'Admin permission required',
      });
    }
  };
}
