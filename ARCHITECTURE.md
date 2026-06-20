# Architecture Decision Records

## ADR-001: Fastify over Express

**Decision**: Use Fastify 5 as the HTTP framework.

**Context**: Express is more common but Fastify offers better TypeScript support, built-in schema validation, higher throughput (~2x benchmarks), and a plugin system that prevents middleware ordering bugs.

**Consequence**: Slightly smaller ecosystem for middleware, but Fastify has official plugins for everything we need (CORS, Helmet, rate limiting, multipart, Swagger).

## ADR-002: Row-Level Tenant Isolation (tenant_id) over Schema-per-Tenant

**Decision**: Multi-tenancy via `tenant_id` column on every table with row-level filtering.

**Context**: Schema-per-tenant provides stronger isolation but is operationally expensive — migrations must run against every schema, connection pooling becomes complex, and onboarding new tenants requires DDL operations.

**Consequence**: Simpler migrations and deployment. Every query must be scoped to `tenant_id` — enforced by middleware and repository patterns. Trade-off: a bug in query scoping could leak data across tenants.

**Mitigation**: Tenant guard middleware validates `tenant_id` on every authenticated request. Integration tests verify cross-tenant isolation.

## ADR-003: Async Processing Queue over Synchronous AI Calls

**Decision**: Document processing happens asynchronously via BullMQ (Redis-backed queue).

**Context**: Claude API calls take 5-60 seconds depending on document size. Synchronous processing would block HTTP connections and cause timeouts. Multiple documents may be uploaded in quick succession.

**Consequence**: Upload returns immediately (HTTP 201) with status `PENDING`. Clients poll or receive webhooks when processing completes. Retry with exponential backoff handles transient failures.

## ADR-004: Idempotency Keys on Processing Jobs

**Decision**: Every processing job has a unique `idempotency_key` checked before execution.

**Context**: BullMQ retries failed jobs automatically. Without idempotency, a retry could create duplicate extracted data or double-count API token usage.

**Consequence**: Worker checks if a job with the same idempotency key has already completed before processing. Upsert pattern for extracted data prevents duplicates even if the check races.

## ADR-005: JWT + API Keys (Dual Auth)

**Decision**: Dashboard users authenticate with JWT tokens. B2B integrations use hashed API keys.

**Context**: Human users need session management (login/logout). Machine clients need long-lived credentials that can be scoped (read/write permissions) and independently revoked.

**Consequence**: Combined auth middleware selects strategy based on which header is present (`Authorization: Bearer` vs `x-api-key`). Both resolve to the same `currentUser` interface for downstream code.

## ADR-006: Bcrypt-Hashed API Keys

**Decision**: API keys are stored as bcrypt hashes, not plaintext.

**Context**: API keys are high-value secrets. A database breach with plaintext keys would compromise all B2B integrations.

**Consequence**: Resolution requires prefix-based candidate lookup + bcrypt comparison. Slightly slower than hash-table lookup but acceptable given the small number of candidates per prefix. The plaintext key is returned once at creation and never again.

## ADR-007: HMAC-Signed Webhooks

**Decision**: Webhook payloads are signed with HMAC-SHA256 using a per-endpoint secret.

**Context**: Webhook receivers need to verify that payloads genuinely come from DocFlow AI, not an attacker who discovered the endpoint URL.

**Consequence**: Each webhook endpoint gets a unique signing secret at creation. The signature is sent in the `X-DocFlow-Signature` header. Receivers compute `HMAC(payload, secret)` and compare.

## ADR-008: Layered Architecture

**Decision**: Routes → Controllers → Services → Repositories.

**Context**: Separating HTTP handling from business logic from data access enables testing each layer independently and swapping implementations (e.g., different database, different AI provider).

**Consequence**: More files and indirection than a flat handler approach. Worth it for a project of this complexity.

## ADR-009: Manual Dependency Injection

**Decision**: Use a hand-written container (`config/container.ts`) instead of a DI framework.

**Context**: DI frameworks (InversifyJS, tsyringe) add decorator-based magic, require `reflect-metadata`, and complicate debugging. Our dependency graph is small enough to manage manually.

**Consequence**: Adding a new service requires updating the container factory. Explicit wiring makes the dependency graph visible in one file.
