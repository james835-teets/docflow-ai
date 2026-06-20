import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const db = new PrismaClient();

async function main() {
  const tenant = await db.tenant.upsert({
    where: { slug: 'demo-corp' },
    update: {},
    create: {
      name: 'Demo Corporation',
      slug: 'demo-corp',
      plan: 'BUSINESS',
    },
  });

  console.log(`Tenant: ${tenant.name} (${tenant.id})`);

  const passwordHash = await bcrypt.hash('demo-password-123', 10);

  const admin = await db.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@demo.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@demo.com',
      passwordHash,
      name: 'Alice Admin',
      role: 'ADMIN',
    },
  });

  await db.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'member@demo.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'member@demo.com',
      passwordHash,
      name: 'Bob Member',
      role: 'MEMBER',
    },
  });

  const sampleDocs = [
    { fileName: 'nda-agreement-2024.pdf', mimeType: 'application/pdf', fileSize: 245_000, status: 'COMPLETED' as const, documentType: 'CONTRACT' as const },
    { fileName: 'invoice-Q4-2024.pdf', mimeType: 'application/pdf', fileSize: 128_000, status: 'COMPLETED' as const, documentType: 'INVOICE' as const },
    { fileName: 'partnership-proposal.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', fileSize: 512_000, status: 'COMPLETED' as const, documentType: 'PROPOSAL' as const },
    { fileName: 'quarterly-report.pdf', mimeType: 'application/pdf', fileSize: 890_000, status: 'PROCESSING' as const, documentType: null },
    { fileName: 'vendor-contract-draft.pdf', mimeType: 'application/pdf', fileSize: 340_000, status: 'PENDING' as const, documentType: null },
  ];

  for (const doc of sampleDocs) {
    const created = await db.document.create({
      data: {
        tenantId: tenant.id,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        storageKey: `${tenant.id}/seed/${doc.fileName}`,
        status: doc.status,
        documentType: doc.documentType,
        uploadedBy: admin.id,
      },
    });

    if (doc.status === 'COMPLETED') {
      await db.extractedData.create({
        data: {
          documentId: created.id,
          summary: getSummary(doc.documentType),
          entities: getEntities(doc.documentType) as never,
          metadata: { language: 'en', source: 'seed' } as never,
          confidence: 0.89 + Math.random() * 0.1,
          modelUsed: 'claude-sonnet-4-20250514',
          tokensUsed: 1200 + Math.floor(Math.random() * 800),
        },
      });
    }
  }

  await db.auditLog.createMany({
    data: [
      { tenantId: tenant.id, userId: admin.id, action: 'user.login', resource: 'auth', details: { method: 'password' } as never },
      { tenantId: tenant.id, userId: admin.id, action: 'document.upload', resource: 'document', details: { fileName: 'nda-agreement-2024.pdf' } as never },
      { tenantId: tenant.id, userId: admin.id, action: 'api_key.create', resource: 'api_key', details: { name: 'CI Pipeline' } as never },
    ],
  });

  console.log('Seed complete!');
  console.log(`\nLogin credentials:`);
  console.log(`  Tenant ID: ${tenant.id}`);
  console.log(`  Admin: admin@demo.com / demo-password-123`);
  console.log(`  Member: member@demo.com / demo-password-123`);
}

function getSummary(type: string | null): string {
  const summaries: Record<string, string> = {
    CONTRACT: 'Non-disclosure agreement between Demo Corporation and Acme Inc. Valid for 24 months with automatic renewal. Covers proprietary technology and business processes.',
    INVOICE: 'Q4 2024 invoice for consulting services. Total amount: $47,500. Payment terms: Net 30. Includes 120 hours of senior engineering at $350/hr and $5,500 in infrastructure costs.',
    PROPOSAL: 'Strategic partnership proposal for joint go-to-market initiative in the European market. Projected revenue impact: $2.1M in Year 1. Requires $350K initial investment.',
  };
  return summaries[type ?? ''] ?? 'Document analysis pending.';
}

function getEntities(type: string | null): Record<string, unknown> {
  const entities: Record<string, Record<string, unknown>> = {
    CONTRACT: { parties: ['Demo Corporation', 'Acme Inc'], duration: '24 months', type: 'NDA' },
    INVOICE: { vendor: 'Demo Corp Consulting', amount: '$47,500', dueDate: '2025-01-30', currency: 'USD' },
    PROPOSAL: { partners: ['Demo Corporation', 'EuroTech GmbH'], investment: '$350,000', market: 'Europe' },
  };
  return entities[type ?? ''] ?? {};
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
