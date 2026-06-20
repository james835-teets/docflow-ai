import { randomUUID } from 'node:crypto';
import type { DocumentStatus } from '@prisma/client';
import { AppError } from '../../../shared/errors/app-error.js';
import type { StorageService } from '../../../infrastructure/storage/s3.js';
import type { ProcessingService } from '../../processing/services/processing.service.js';
import type { DocumentRepository } from '../repositories/document.repository.js';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../schemas.js';

export class DocumentService {
  private processingService: ProcessingService | null = null;

  constructor(
    private readonly repo: DocumentRepository,
    private readonly storage: StorageService,
  ) {}

  setProcessingService(processingService: ProcessingService) {
    this.processingService = processingService;
  }

  async upload(
    tenantId: string,
    file: { filename: string; mimetype: string; data: Buffer },
    uploadedBy?: string,
  ) {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype as (typeof ALLOWED_MIME_TYPES)[number])) {
      throw AppError.badRequest(`Unsupported file type: ${file.mimetype}`);
    }

    if (file.data.length > MAX_FILE_SIZE) {
      throw AppError.badRequest(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    const storageKey = `${tenantId}/${randomUUID()}/${file.filename}`;
    await this.storage.upload(storageKey, file.data, file.mimetype);

    const doc = await this.repo.create({
      tenantId,
      fileName: file.filename,
      fileSize: file.data.length,
      mimeType: file.mimetype,
      storageKey,
      uploadedBy,
    });

    if (this.processingService) {
      await this.processingService.enqueue(doc.id, tenantId, storageKey);
    }

    return doc;
  }

  async getById(id: string, tenantId: string) {
    const doc = await this.repo.findById(id, tenantId);
    if (!doc) throw AppError.notFound('Document');
    return doc;
  }

  async list(tenantId: string, page: number, limit: number, status?: DocumentStatus) {
    return this.repo.findMany(tenantId, page, limit, status);
  }

  async getDownloadUrl(id: string, tenantId: string) {
    const doc = await this.getById(id, tenantId);
    const url = await this.storage.getSignedDownloadUrl(doc.storageKey);
    return { url, fileName: doc.fileName };
  }
}
