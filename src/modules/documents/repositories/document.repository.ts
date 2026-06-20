import type { PrismaClient, DocumentStatus } from '@prisma/client';

export class DocumentRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(data: {
    tenantId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    storageKey: string;
    uploadedBy?: string;
  }) {
    return this.db.document.create({ data });
  }

  async findById(id: string, tenantId: string) {
    return this.db.document.findFirst({
      where: { id, tenantId },
      include: { extractedData: true },
    });
  }

  async findMany(tenantId: string, page: number, limit: number, status?: DocumentStatus) {
    const where = { tenantId, ...(status && { status }) };
    const [data, total] = await Promise.all([
      this.db.document.findMany({
        where,
        include: { extractedData: { select: { summary: true, confidence: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.document.count({ where }),
    ]);
    return { data, total };
  }

  async updateStatus(id: string, status: DocumentStatus, error?: string) {
    return this.db.document.update({
      where: { id },
      data: { status, ...(error && { processingError: error }) },
    });
  }
}
