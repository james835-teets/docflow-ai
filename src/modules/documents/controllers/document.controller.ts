import type { FastifyReply, FastifyRequest } from 'fastify';
import { ok, paginated } from '../../../shared/types/api.js';
import { AppError } from '../../../shared/errors/app-error.js';
import type { DocumentService } from '../services/document.service.js';
import { listDocumentsSchema } from '../schemas.js';

export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  async upload(request: FastifyRequest, reply: FastifyReply) {
    const user = request.currentUser;
    if (!user) throw AppError.unauthorized();

    const file = await request.file();
    if (!file) throw AppError.badRequest('No file uploaded');

    const buffer = await file.toBuffer();
    const doc = await this.documentService.upload(
      user.tenantId,
      { filename: file.filename, mimetype: file.mimetype, data: buffer },
      user.authMethod === 'jwt' ? user.id : undefined,
    );

    return reply.status(201).send(ok(doc));
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const user = request.currentUser;
    if (!user) throw AppError.unauthorized();
    const { id } = request.params as { id: string };
    const doc = await this.documentService.getById(id, user.tenantId);
    return reply.send(ok(doc));
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const user = request.currentUser;
    if (!user) throw AppError.unauthorized();
    const { page, limit, status } = listDocumentsSchema.parse(request.query);
    const { data, total } = await this.documentService.list(user.tenantId, page, limit, status);
    return reply.send(paginated(data, total, page, limit));
  }

  async getDownloadUrl(request: FastifyRequest, reply: FastifyReply) {
    const user = request.currentUser;
    if (!user) throw AppError.unauthorized();
    const { id } = request.params as { id: string };
    const result = await this.documentService.getDownloadUrl(id, user.tenantId);
    return reply.send(ok(result));
  }
}
