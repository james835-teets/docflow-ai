# DocFlow AI — Enterprise Document Intelligence Platform

Multi-tenant SaaS platform for AI-powered business document analysis. Upload contracts, invoices, and proposals — the system classifies, extracts key data, and summarizes them using Claude API.

[![CI](https://github.com/Tony75546885/docflow-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/Tony75546885/docflow-ai/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Deploy

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Tony75546885/docflow-ai)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
│                    Dashboard / Upload / Results                  │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP
┌────────────────────────────▼────────────────────────────────────┐
│                     Fastify API Server                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────────┐   │
│  │   Auth   │ │  Tenants │ │  Users   │ │   Documents     │   │
│  │ JWT/Keys │ │  CRUD    │ │  CRUD    │ │ Upload/List/Get │   │
│  └──────────┘ └──────────┘ └──────────┘ └────────┬────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐          │            │
│  │ Webhooks │ │  Audit   │ │  RBAC    │          │            │
│  │ HMAC-sig │ │   Log    │ │ Middleware│          │            │
│  └──────────┘ └──────────┘ └──────────┘          │            │
└──────────────────────────────────────────────────┼────────────┘
                                                   │ Enqueue
┌──────────────────────────────────────────────────▼────────────┐
│                     BullMQ (Redis)                             │
│            Document Processing Queue                           │
│        Retry with exponential backoff                          │
│              Idempotency keys                                  │
└──────────────────────────────┬────────────────────────────────┘
                               │ Process
┌──────────────────────────────▼────────────────────────────────┐
│                    Document Worker                              │
│  1. Download from S3  →  2. Extract text                       │
│  3. Claude API call   →  4. Save results to DB                 │
│  5. Trigger webhooks  →  6. Update status                      │
└───────────────────────────────────────────────────────────────┘

Data stores:
  ├── PostgreSQL  — tenants, users, documents, results, audit log
  ├── Redis       — job queue, rate limiting
  └── MinIO (S3)  — document file storage
```

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url> && cd docflow-ai
npm install

# 2. Start infrastructure
docker compose up -d

# 3. Configure
cp .env.example .env
# Edit .env — set your ANTHROPIC_API_KEY

# 4. Run migrations
npx prisma migrate dev

# 5. Start the server
npm run dev
# API at http://localhost:3000
# Swagger UI at http://localhost:3000/docs

# 6. Start the frontend (optional)
cd frontend && npm install && npm run dev
# Dashboard at http://localhost:5173
```

## API Overview

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | - | Health check |
| `/auth/register` | POST | - | Register user |
| `/auth/login` | POST | - | Login → JWT |
| `/auth/me` | GET | JWT | Current user |
| `/auth/api-keys` | POST/GET/DELETE | JWT (Admin) | Manage API keys |
| `/tenants` | POST/GET/PATCH | JWT | Tenant CRUD |
| `/users` | GET/PATCH/DELETE | JWT | User management |
| `/documents` | POST/GET | JWT/API Key | Upload & list |
| `/documents/:id` | GET | JWT/API Key | Document details |
| `/documents/:id/download` | GET | JWT/API Key | Signed download URL |
| `/webhooks` | POST/GET/PATCH/DELETE | JWT (Admin) | Webhook management |
| `/audit-logs` | GET | JWT (Admin) | Audit trail |
| `/docs` | GET | - | Swagger UI |

## Testing

```bash
npm test                # Unit tests
npm run test:integration # Integration tests (requires Docker)
npm run test:coverage    # Coverage report
```

## Tech Stack

- **Runtime**: Node.js 22, TypeScript 5.6
- **Framework**: Fastify 5
- **Database**: PostgreSQL 16 + Prisma ORM
- **Queue**: Redis 7 + BullMQ
- **Storage**: S3-compatible (MinIO locally, AWS S3 in production)
- **AI**: Claude API (structured extraction)
- **Frontend**: React 19 + Tailwind CSS
- **Auth**: JWT + bcrypt-hashed API keys
- **Docs**: OpenAPI 3.0 / Swagger UI
- **CI**: GitHub Actions
- **Container**: Docker + docker-compose

## Multi-Tenancy

Every database query is scoped to `tenant_id`. Middleware enforces tenant isolation at the request level — users can only access resources belonging to their tenant.

## RBAC

Three roles per tenant: **Admin** (full access, manage keys/webhooks), **Member** (upload, view), **Viewer** (read-only).
