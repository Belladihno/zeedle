# Zeedle — Technical Requirements Document (TRD)

**Version:** 1.0.0
**Date:** 30 September 2026
**Author:** Sasuke
**Status:** Active Build

---

## Table of Contents

1. Project Overview
2. Business Context & Compliance
3. Domain Map & System Workflow
4. Architecture Decision Record
5. Monorepo Structure
6. Backend Internal Architecture
7. Frontend Architecture
8. Database Architecture
9. Security Architecture
10. Observability Architecture
11. Infrastructure & Deployment
12. Design System
13. Responsive Design Specification
14. Step-by-Step Build Plan
15. Environment Variables Reference

---

## 1. Project Overview

### 1.1 What Is Zeedle

Zeedle is a production-grade digital wallet and peer-to-peer payment platform built with NestJS and TypeScript. It is a self-directed portfolio project designed to demonstrate backend engineering capability at the level required by Nigerian fintech companies operating under CBN licensing — specifically targeting roles at PSSPs (Payment Solution Service Providers) and financial technology firms such as Paymi Solutions Limited (Payzeep).

### 1.2 What Zeedle Covers

Zeedle implements the following financial primitives:

- User registration and authentication with JWT
- Wallet provisioning per user on registration
- Wallet funding via Paystack payment gateway (collection)
- Peer-to-peer wallet transfers with double-entry bookkeeping
- Immutable transaction audit trail
- Batch settlement processing (admin-triggered)
- In-app notifications on transaction events
- Consumer-facing wallet interface
- Admin dashboard for platform oversight

### 1.3 Why These Decisions Were Made

Every architectural and tooling decision in Zeedle is made against a specific threat, regulatory requirement, or production concern — not convention. The goal is to produce a codebase that a senior fintech engineer would read and immediately understand as production-aware, not tutorial-derived.

### 1.4 Target Job Description Alignment

The Payzeep JD requires the following, and this document maps each to a concrete Zeedle decision:

| JD Requirement | Zeedle Implementation |
|---|---|
| Node.js/TypeScript RESTful API | NestJS 12 + TypeScript strict mode |
| Wallet management, transfers, settlements | Core domain modules |
| Transaction integrity and audit trails | Insert-only transactions table, QueryRunner atomicity |
| Secure coding (OWASP) | 10-layer security pipeline |
| PCI-DSS alignment | No card storage, HMAC verification, env validation |
| NDPA 2023 compliance | Data minimisation, soft delete, no PII in logs |
| Relational database | PostgreSQL (Neon) |
| Message queues | Architecture documented; Redis for async jobs |
| Containerisation | Docker + docker-compose |
| CI/CD | GitHub Actions |
| Cloud (AWS/GCP/Azure) | GCP Cloud Run mapping documented in README |
| Observability | @nestjs/observe + Pino structured logging |
| Microservices awareness | Modular monolith with explicit service boundaries |

---

## 2. Business Context & Compliance

### 2.1 Regulatory Position

Zeedle operates as a simulated PSSP (Payment Solution Service Provider) environment. It does not store card data, issue cards, or operate a banking licence. It integrates with Paystack as a licensed payment processor. This places Zeedle in the "merchant" tier of PCI-DSS — responsible for secure development practices but not full cardholder data environment controls.

### 2.2 PCI-DSS Alignment (Secure Development Requirements)

PCI-DSS Requirement 6 covers secure development. Zeedle addresses it as follows:

**Requirement 2 — No default credentials**
Environment variables are validated at startup using Zod. The application refuses to boot if JWT_SECRET is under 32 characters, DB_PASSWORD is under 16 characters, or PAYSTACK_SECRET does not begin with `sk_`. This prevents weak or default secrets from ever reaching production.

**Requirement 3 — Protect stored data**
No card numbers, CVVs, or expiry dates are stored anywhere in Zeedle. Paystack's hosted checkout page handles all card data. User PINs are hashed with bcrypt (cost factor 12 minimum). No sensitive fields are returned in API responses — class-transformer @Exclude() decorators are applied to password and pin on all entity classes.

**Requirement 6 — Secure development**
- All input validated with class-validator before reaching business logic
- All input sanitized with class-transformer (whitelist:true strips unknown properties)
- eslint-plugin-security runs on every commit via Husky pre-commit hook — catches SQL injection patterns, unsafe regex, eval usage
- pnpm audit runs in CI and fails the build on high-severity CVEs
- secretlint scans every commit for accidentally committed secrets
- TypeORM uses parameterised queries exclusively — raw SQL is banned in this codebase
- All dependencies pinned to exact versions in package.json

**Requirement 7 — Least privilege**
Users can only access their own wallet and transaction history. Role-based access control separates USER and ADMIN roles. Admin routes are protected by a separate RolesGuard that checks the JWT role claim before any controller logic runs.

**Requirement 8 — Strong authentication**
- JWT uses RS256 (asymmetric) — private key signs, public key verifies. Private key never leaves the server
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days with rotation — old token invalidated on use
- PIN lockout after 3 failed attempts, stored in Redis with 30-minute TTL
- Auth errors return identical generic messages regardless of whether email or password was wrong — prevents user enumeration

**Requirement 10 — Logging and monitoring**
- Every transaction logged with userId, amount in kobo, timestamp, IP address, requestId
- Logs are structured JSON, write-only — no API endpoint to query or delete logs
- @nestjs/observe provides APM tracing across every request

### 2.3 NDPA 2023 (Nigeria Data Protection Act)

The NDPA came into full effect in 2023 and is enforced by the Nigeria Data Protection Commission (NDPC). Zeedle implements the following controls:

**Data minimisation**
Only data necessary to operate the service is collected: name, email, phone number, hashed password, hashed PIN. No device fingerprints, no location data, no behavioural tracking.

**Lawful basis**
All data collection is necessary for contract performance — the user cannot use the wallet service without providing their name and email. No consent dark patterns.

**Right to erasure with financial override**
Users can request account deletion. The system anonymises all PII fields (email replaced with `deleted_{uuid}@zeedle.invalid`, name replaced with `Deleted User`, phone set to null). Transaction records are retained — CBN regulations require financial records for 7 years, which overrides the right to erasure for transaction data specifically.

**No PII in logs**
Logger middleware strips PII before any log line is written. User IDs (UUIDs) are logged, never email addresses, names, phone numbers, or account numbers.

**Data retention policy**
- Transaction records: 7 years (CBN requirement)
- User PII: anonymised 30 days after deletion request
- Application logs: 90 days, then purged
- Redis cache: TTL set on every key — no indefinite storage

**Data transfer note**
Render (US region) and Neon (US region) are used for this portfolio version. In production, a Nigerian fintech would need NDPC approval for cross-border data transfer or host in-country. This is documented in PRIVACY_POLICY.md and README.md as a known production consideration.

---

## 3. Domain Map & System Workflow

### 3.1 Entity Relationships

```
User ──< Wallet ──< Transaction
User ──< TransactionPin
Transaction >── Settlement (batch reference)
User ──< Notification
```

Each user has exactly one wallet, provisioned automatically on registration. Each wallet has many transactions. Transactions reference a settlement batch when settled. A transaction pin belongs to the user, not the wallet.

### 3.2 End-to-End Workflow

**Registration flow**
User submits name, email, phone, password → backend validates and sanitizes → password hashed with bcrypt (cost 12) → user record created → wallet automatically provisioned with zero balance → JWT access and refresh tokens returned → user lands on dashboard.

**Wallet funding flow**
User requests funding → backend calls Paystack Initialize Transaction API → Paystack returns a checkout URL → user is redirected to Paystack hosted page → user enters card details on Paystack's page (Zeedle never sees card data) → Paystack processes payment → Paystack sends webhook to `/payments/webhook` → backend verifies HMAC-SHA512 signature using Paystack secret key → signature verified → wallet balance credited by exact kobo amount → transaction record created with type CREDIT, source PAYSTACK, status SUCCESS → notification created → user's balance updates.

**Peer-to-peer transfer flow**
User submits recipient user ID, amount in naira, PIN, optional narration → backend converts amount to kobo → idempotency key checked against Redis (prevents duplicate submission on retry) → PIN verified against bcrypt hash → sender balance checked — must be ≥ amount + fee → TypeORM QueryRunner transaction begins → sender wallet debited → recipient wallet credited → two transaction records created, linked by shared referenceId → QueryRunner transaction commits → idempotency key stored in Redis with 24h TTL → notifications created for both parties → success response returned. If any step fails, QueryRunner rolls back — no partial state is possible.

**Settlement flow**
Admin triggers settlement via POST /settlements/run with a date range → backend aggregates all CREDIT transactions in the range with status SUCCESS and settlement status UNSETTLED → settlement batch record created → all qualifying transactions marked SETTLED → settlement report returned with total amount, transaction count, date range. In production this would run as a scheduled cron job — both manual trigger and scheduled execution are supported.

### 3.3 Monetary Arithmetic Rule

All monetary values are stored and computed as integers in kobo (Nigerian naira smallest unit, 1 naira = 100 kobo). This is non-negotiable. Floating-point arithmetic on monetary values causes rounding errors that accumulate over time and are a known source of financial discrepancies. The UI layer converts kobo to naira for display only, never for computation.

Example: ₦5,000 is stored as 500000 (five hundred thousand kobo). The display layer divides by 100 and formats with the ₦ symbol and comma separators.

---

## 4. Architecture Decision Record

### 4.1 Modular Monolith over Microservices

**Decision:** Zeedle is a single deployable NestJS application with strongly bounded internal modules.

**Rationale:** Microservices introduce distributed system complexity — network partitions, distributed transactions, service discovery, inter-service auth — that is difficult to demonstrate well in a solo portfolio project and adds operational overhead that has no benefit at this scale. A modular monolith with clean domain boundaries demonstrates the same architectural thinking (separation of concerns, single responsibility, domain isolation) without the operational theatre. If Zeedle were to scale, the module boundaries are already defined in a way that makes extraction to microservices straightforward.

### 4.2 NestJS 12 with Fastify over Express

**Decision:** Use `@nestjs/platform-fastify` instead of the default Express adapter.

**Rationale:** Fastify is 20–30% faster in throughput benchmarks, has a smaller attack surface with fewer historical CVEs than Express, validates HTTP schemas by default, and serialises JSON responses more efficiently. For a payment API where performance and security both matter, Fastify is the correct choice. The NestJS Fastify adapter is fully supported and maintained.

### 4.3 TypeORM with Explicit Migrations over Prisma

**Decision:** TypeORM with `synchronize: false` in all environments.

**Rationale:** `synchronize: true` in TypeORM can silently drop columns when entity definitions change — this is catastrophic in a financial system. All schema changes go through explicitly written migration files that are reviewed before running. TypeORM's QueryRunner gives explicit transactional control over multi-step write operations (transfer debits and credits), which is more transparent than Prisma's transaction API for financial double-entry patterns. TypeORM's query output is also easier to audit for SQL injection patterns during code review.

### 4.4 Custom JWT Auth over Passport or NextAuth

**Decision:** Custom JwtAuthGuard using `@nestjs/jwt` directly, no Passport strategies, no NextAuth.

**Rationale:** Passport.js adds an abstraction layer over authentication that increases the number of files and concepts required to understand the auth flow. For JWT-only authentication, the abstraction provides no benefit and makes the code harder to audit. A custom guard using `@nestjs/jwt` is 30 lines, fully transparent, and easier for a security reviewer to follow. RS256 (asymmetric) is used so the public key can be shared with other services without exposing the signing key.

### 4.5 pnpm over npm or yarn

**Decision:** pnpm as the workspace package manager.

**Rationale:** pnpm's non-flat `node_modules` structure means each package can only access its explicitly declared dependencies. npm and yarn hoist all packages into a single flat `node_modules`, which enables dependency confusion attacks where a malicious package can access packages it was never supposed to reach. For a security-conscious fintech project, this isolation matters. pnpm is also significantly faster at installing in CI environments and uses less disk space via its content-addressable store.

### 4.6 Admin as a Separate Subdomain

**Decision:** Consumer app at `zeedle.com`, admin dashboard at `admin.zeedle.com`, two separate Next.js apps in the monorepo.

**Rationale:** Serving both from the same origin means the same cookie scope, same CSP headers, and same session boundary. A successful XSS on the consumer app could reach admin session tokens. Separate subdomains are separate browser origins — completely isolated cookie jars, separate CSP policies, separate Vercel deployments. Rollback of one does not affect the other. In production, `admin.zeedle.com` would be IP-restricted to corporate networks. This is standard fintech practice (Paystack: `dashboard.paystack.com`).

### 4.7 Redis Abstraction Layer

**Decision:** `IRedisService` interface with `LocalRedisService` (ioredis, TCP) and `UpstashRedisService` (@upstash/redis, HTTP) as environment-switched implementations.

**Rationale:** Upstash Redis is HTTP-based and cannot be used with ioredis. ioredis is TCP-based and cannot be used with Upstash's API. Rather than writing Redis logic twice or choosing one that breaks in the other environment, an interface abstracts the implementation. The NestJS DI container injects the correct provider based on NODE_ENV. Application code calls `this.redis.get(key)` without knowing which client is underneath. This is also a clean example of the dependency inversion principle — high-level modules depend on abstractions, not concretions.

### 4.8 Insert-Only Transactions Table

**Decision:** The `transactions` table allows INSERT operations only. No UPDATE, no DELETE, enforced at the repository layer and documented as a constraint.

**Rationale:** Financial audit trails must be immutable. If a transaction record can be modified or deleted, the audit trail is worthless. Every state change in a transaction (pending → success → settled) creates a new record rather than updating the existing one. This mirrors how real core banking systems work and is a CBN/PCI-DSS expectation.

---

## 5. Monorepo Structure

### 5.1 Workspace Layout

```
zeedle/
├── apps/
│   ├── api/                     ← NestJS 12 backend
│   ├── web/                     ← Next.js 15 consumer app (zeedle.com)
│   └── admin/                   ← Next.js 15 admin dashboard (admin.zeedle.com)
├── packages/
│   ├── shared-types/            ← Zod schemas, TypeScript types, enums
│   └── config/                  ← Shared ESLint, TypeScript, Prettier configs
├── .github/
│   └── workflows/
│       ├── ci.yml               ← PR pipeline
│       └── deploy.yml           ← Merge to main pipeline
├── docker-compose.yml           ← Local development services
├── pnpm-workspace.yaml          ← Workspace definition
├── turbo.json                   ← Build orchestration
├── package.json                 ← Root devDependencies
├── .gitignore
├── .env.example
├── SECURITY.md                  ← Threat model and security posture
└── README.md                    ← Setup guide + cloud mapping table
```

### 5.2 pnpm-workspace.yaml

Declares all apps and packages as workspace members so pnpm links them together locally.

```
packages:
  - 'apps/*'
  - 'packages/*'
```

### 5.3 turbo.json — Task Orchestration

Turborepo orchestrates build tasks across the workspace. It understands dependency order, caches outputs, and enables parallel execution where safe.

The `build` task uses `dependsOn: ["^build"]` — the `^` prefix means "run the build task in all dependency packages first." So `shared-types` always builds before `api`, `web`, or `admin` try to build.

The `dev` task has `cache: false` and `persistent: true` — long-running dev servers must not be cached and must not be treated as hanging processes.

The `test` and `lint` tasks run across all packages in parallel with no dependency on each other.

When a developer runs `turbo dev` from the monorepo root, Turborepo starts all three dev servers (api, web, admin) simultaneously, in the correct order, with a single command.

### 5.4 packages/shared-types

This package is the single source of truth for all data contracts shared between the frontend and backend.

Contents:
- Zod schemas for every DTO: TransferSchema, FundWalletSchema, LoginSchema, RegisterSchema
- TypeScript types inferred from those schemas
- Enums: TransactionType, TransactionStatus, Role, SettlementStatus
- API response shape types: WalletDto, TransactionDto, UserDto, SettlementDto

The backend uses these schemas in ValidationPipe for request validation. The frontend uses the same schemas in React Hook Form resolvers for form validation. One schema change propagates everywhere in the monorepo instantly.

### 5.5 packages/config

Shared configuration files consumed by all workspace packages:
- `eslint-base.js` — shared ESLint rules including eslint-plugin-security
- `tsconfig.base.json` — shared TypeScript compiler options (strict: true, exactOptionalPropertyTypes: true)
- `prettier.config.js` — shared formatting rules

Individual apps extend these shared configs rather than duplicating them.

---

## 6. Backend Internal Architecture

### 6.1 Top-Level Folder Structure

```
apps/api/src/
├── main.ts                       ← Bootstrap, Fastify, global middleware
├── app.module.ts                 ← Root module, imports CoreModule
│
├── core/                         ← Framework-level concerns, loaded once
│   ├── database/                 ← TypeORM configuration, migration runner
│   ├── redis/                    ← Redis module, IRedisService, two providers
│   ├── logger/                   ← Pino setup, RequestIdMiddleware
│   ├── config/                   ← @nestjs/config + Zod env validation
│   └── filters/                  ← GlobalExceptionFilter (RFC 7807)
│
├── common/                       ← Reusable building blocks, no business logic
│   ├── decorators/               ← @CurrentUser(), @IdempotencyKey(), @Roles()
│   ├── guards/                   ← JwtAuthGuard, RolesGuard, RateLimitGuard
│   ├── interceptors/             ← LoggingInterceptor, TransformResponseInterceptor
│   ├── pipes/                    ← SanitizationPipe, ParseKoboPipe
│   ├── middleware/               ← RequestIdMiddleware, IdempotencyMiddleware
│   └── types/                    ← Internal TypeScript types
│
├── modules/                      ← Business domain modules
│   ├── auth/                     ← Registration, login, token refresh, logout
│   ├── users/                    ← User profile, anonymisation (NDPA deletion)
│   ├── wallets/                  ← Wallet CRUD, balance queries
│   ├── transactions/             ← Transaction history, filters, pagination
│   ├── payments/                 ← Paystack integration, webhook handler
│   ├── transfers/                ← P2P transfer engine, double-entry
│   ├── settlements/              ← Batch settlement trigger and history
│   └── notifications/            ← In-app notification creation and delivery
│
└── infrastructure/               ← External service adapters
    ├── paystack/                 ← Paystack HTTP client, HMAC verification
    ├── mail/                     ← Email adapter (Nodemailer or Resend)
    └── encryption/               ← AES-256-GCM field encryption, bcrypt helpers
```

### 6.2 Module Internal Pattern

Every domain module follows the same internal structure. This pattern is enforced as a project convention — no exceptions.

```
modules/wallets/
├── wallets.module.ts             ← NestJS module definition
├── wallets.controller.ts         ← Route handlers, guards, decorators
├── wallets.service.ts            ← Business logic, no direct DB access
├── wallets.repository.ts         ← Data access layer, TypeORM calls live here
├── entities/
│   └── wallet.entity.ts          ← TypeORM entity definition
├── dto/
│   ├── fund-wallet.dto.ts        ← Request shape, class-validator decorators
│   └── wallet-response.dto.ts    ← Response shape, @Exclude() on sensitive fields
└── tests/
    ├── wallets.service.spec.ts   ← Unit tests (mock repository)
    └── wallets.controller.spec.ts← Unit tests (mock service)
```

The service never imports TypeORM repositories directly. It imports the module's repository class, which encapsulates all database operations. This means unit tests mock the repository, not TypeORM internals, making them fast and reliable without a real database connection.

### 6.3 Request Lifecycle — Full Pipeline

Every HTTP request passes through the following layers in strict order before any business logic executes:

**Layer 1 — @fastify/helmet**
Sets HTTP security headers on every response: Content-Security-Policy, Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy. This runs before anything else and cannot be bypassed.

**Layer 2 — RequestIdMiddleware**
Generates a UUID v4 `x-request-id` header if one is not present in the incoming request. Attaches it to the request object. Every subsequent log line in this request lifecycle includes this ID, enabling end-to-end tracing across all log statements.

**Layer 3 — RateLimitGuard**
Checks the request's IP and userId (if authenticated) against rate limit counters in Redis. Auth endpoints: 5 requests per minute. Payment endpoints: 10 per minute. General API: 100 per minute. Responds with 429 Too Many Requests with a Retry-After header if exceeded. Uses sliding window algorithm via @upstash/ratelimit.

**Layer 4 — IdempotencyMiddleware**
For state-changing endpoints (POST /transfers, POST /payments/fund), checks for an `x-idempotency-key` header. If the key exists in Redis, returns the cached response immediately without re-executing the business logic. This prevents duplicate transfers when a client retries a request due to a timeout. Keys expire after 24 hours.

**Layer 5 — JwtAuthGuard**
Extracts the Bearer token from the Authorization header. Verifies the RS256 signature against the public key. Checks expiry. If valid, decodes the payload and attaches the user object to the request. If invalid or missing on a protected route, returns 401 Unauthorized with a generic message.

**Layer 6 — RolesGuard**
Reads the `@Roles()` decorator on the route handler. Compares the required role against the role claim in the JWT payload. If the user's role does not meet the requirement, returns 403 Forbidden. This runs after JwtAuthGuard so the user object is already on the request.

**Layer 7 — ValidationPipe (class-validator)**
Transforms the raw request body into the route's DTO class. Runs all class-validator decorators (@IsString, @IsInt, @Min, @Max, @IsEmail etc.). If any validation fails, returns 400 Bad Request with a structured error listing every failing field and rule. `whitelist: true` strips any property not declared in the DTO, killing prototype pollution and unknown field injection before business logic sees the data. `forbidNonWhitelisted: true` rejects requests with extra fields entirely rather than silently stripping them.

**Layer 8 — SanitizationPipe (class-transformer)**
Runs after validation. Applies @Transform decorators: trims whitespace from all string fields, strips HTML tags from narration fields using sanitize-html (preventing stored XSS), ensures amount fields are floored integers (preventing floating-point tricks), applies maximum length limits. Input that passes validation but is still dangerous is neutralised here.

**Layer 9 — Controller → Service → Repository**
Business logic executes here. Service calls repository methods. Repository executes TypeORM operations. No layer calls a layer it should not — controllers never call repositories, services never call other services directly (they use injected dependencies).

**Layer 10 — TransformResponseInterceptor**
Wraps every successful response in a standard envelope before it leaves the API:
`{ success: true, data: <payload>, meta: { requestId, timestamp } }`
This means every API consumer gets a consistent response shape regardless of which endpoint they call.

**Layer 10 (error path) — GlobalExceptionFilter**
Catches all unhandled exceptions. Maps them to RFC 7807 Problem Details format:
`{ type, title, status, detail, instance }`. No raw stack traces, no internal error messages, no framework error strings reach the client in production. All exceptions are logged with full context before the sanitised response is sent.

### 6.4 Domain Modules — Responsibilities

**auth module**
Handles registration (create user + provision wallet in one transaction), login (verify password, issue tokens), refresh (rotate refresh token), logout (invalidate refresh token in Redis), forgot-password (email link), reset-password.

**users module**
Handles profile reads, profile updates, PIN creation and change, account deletion (NDPA anonymisation — does not delete transaction records).

**wallets module**
Handles wallet balance queries, wallet status management (active/frozen). Wallet creation is called internally by auth module on registration — no public endpoint to create a wallet.

**transactions module**
Handles transaction history queries with pagination and filtering by type, status, and date range. Read-only module — no write operations. Writes happen in payments and transfers modules.

**payments module**
Handles Paystack initialization (creates checkout session) and webhook reception. Webhook handler verifies HMAC-SHA512 signature before processing. On verified webhook, credits the wallet and creates a transaction record. This is the only module that talks to the Paystack infrastructure adapter.

**transfers module**
Handles P2P transfer execution. Contains the double-entry bookkeeping logic. Uses TypeORM QueryRunner to ensure atomicity. Validates PIN against bcrypt hash before executing. Checks balance. Executes debit and credit as a single database transaction that either fully succeeds or fully rolls back.

**settlements module**
Handles settlement batch creation (admin only), settlement history queries (admin only), and the batch processing logic that aggregates unsettled transactions and marks them as settled.

**notifications module**
Handles notification creation (called internally by transfers, payments, settlements) and notification delivery (read, mark-as-read endpoints for the consumer app).

---

## 7. Frontend Architecture

### 7.1 Two Separate Next.js Applications

**apps/web** — Consumer wallet application, deployed to `zeedle.com`
**apps/admin** — Admin dashboard, deployed to `admin.zeedle.com`

Both are independent Next.js 15 projects with their own dependencies, their own Vercel deployments, and their own environment variables. They share `packages/shared-types` via the pnpm workspace.

### 7.2 Consumer App Route Structure (apps/web)

```
app/
├── (auth)/
│   ├── login/page.tsx
│   └── register/page.tsx
├── (consumer)/
│   ├── layout.tsx               ← Sidebar layout wrapper
│   ├── dashboard/page.tsx       ← Wallet card + recent transactions
│   ├── transfer/page.tsx        ← Recipient + amount form
│   ├── transfer/confirm/page.tsx← PIN confirmation + review
│   ├── fund/page.tsx            ← Paystack redirect
│   ├── transactions/page.tsx    ← Full history with filters
│   └── settings/page.tsx        ← Profile, PIN change, delete account
├── error.tsx                    ← Global error boundary (stale chunk handler)
├── not-found.tsx
└── layout.tsx                   ← Root layout, fonts, providers
middleware.ts                    ← JWT route protection
```

### 7.3 Admin App Route Structure (apps/admin)

```
app/
├── (auth)/
│   └── login/page.tsx           ← Admin-only login, separate from consumer auth
├── (admin)/
│   ├── layout.tsx               ← Admin sidebar layout
│   ├── overview/page.tsx        ← Stats + charts
│   ├── users/page.tsx           ← User table + search + actions
│   ├── users/[id]/page.tsx      ← Individual user detail + freeze/suspend
│   ├── transactions/page.tsx    ← All platform transactions
│   └── settlements/page.tsx     ← Settlement trigger + history
├── error.tsx
└── layout.tsx
middleware.ts                    ← Admin route protection (checks ADMIN role)
```

### 7.4 Data Fetching Strategy

**TanStack Query v5** manages all server state. Every API call goes through a query or mutation. This provides automatic caching, background refetching, stale-while-revalidate, retry on failure, and loading/error states without manual useState management.

Wallet balance uses a short stale time (30 seconds) so it refetches in the background frequently without blocking the UI. Transaction history uses a longer stale time (2 minutes) since it changes less frequently.

Mutations (transfer submit, fund wallet) are followed by cache invalidation of the wallet balance and transaction list queries — the UI updates immediately after a successful action without requiring a manual refresh.

**Zustand v5** manages client state: the authenticated user object, the active JWT access token (stored in memory, never localStorage), and UI state like the sidebar open/close toggle.

Access tokens live in Zustand (in-memory). Refresh tokens live in httpOnly cookies set by the API. This means access tokens are never accessible to JavaScript running in XSS attacks (only valid for the current tab session), and refresh tokens are never accessible to JavaScript at all.

### 7.5 Form Validation Strategy

React Hook Form handles all form state. Zod schemas from `packages/shared-types` are passed to `@hookform/resolvers/zod` as the form resolver. This means the same Zod schema that validates input on the backend also validates it on the frontend — one schema, two validation contexts, no duplication, no drift.

### 7.6 HTTP Client Strategy

**ky** is used as the HTTP client in both apps. It is a lightweight fetch wrapper (1.4KB) with built-in retry logic, timeout support, and hook points for request/response transformation. An instance is configured at app startup with the API base URL and a request hook that attaches the Authorization header from Zustand.

A response hook handles 401 responses by attempting a token refresh before retrying the original request. If the refresh fails, the user is redirected to login. This is the entire auth refresh flow — no Axios interceptors, no complex middleware.

### 7.7 Zero-Downtime on Vercel (Stale Chunk Error Handler)

Vercel deploys atomically — the cutover from old to new version is instant at the CDN level. However, a user with the old version open in their browser holds references to old JS chunk URLs with content hashes. When they navigate to a new route that triggers lazy loading, Next.js attempts to fetch the old chunk URL, which no longer exists, and throws an unhandled error.

The global `error.tsx` boundary catches this. It detects the specific error message pattern produced by a chunk load failure and calls `window.location.reload()`, which loads the new version seamlessly. The user experiences a brief page reload rather than a broken application.

---

## 8. Database Architecture

### 8.1 Database Choice

PostgreSQL 16 via Neon (serverless, free tier: 0.5GB storage, 100 compute hours/month).

Neon is serverless — it scales to zero after inactivity, causing a cold start (500ms–1s) on the first query after sleep. For a Render-hosted long-running server, the connection pooler endpoint must be used. The DATABASE_URL must point to the `-pooler.neon.tech` hostname, not the direct hostname. TypeORM is configured with a pool size of 10 and a connection timeout of 10 seconds to accommodate cold start latency.

### 8.2 Entity Definitions

**User**
id (UUID v7), email (unique), firstName, lastName, phone, passwordHash, role (USER | ADMIN), isActive, isDeleted, deletedAt, createdAt, updatedAt

**Wallet**
id (UUID v7), userId (FK → User, unique), balanceKobo (BIGINT, not null, default 0), currency (default NGN), isActive, createdAt, updatedAt

**Transaction**
id (UUID v7), walletId (FK → Wallet), type (CREDIT | DEBIT), status (PENDING | SUCCESS | FAILED | REVERSED), source (PAYSTACK | TRANSFER | SYSTEM), amount (BIGINT in kobo), fee (BIGINT in kobo, default 0), balanceBefore (BIGINT in kobo), balanceAfter (BIGINT in kobo), referenceId (shared between debit and credit records of same transfer), externalReference (Paystack reference), narration, metadata (JSONB), settlementId (FK → Settlement, nullable), createdAt

No updatedAt on Transaction — this column does not exist. Transaction records are never modified after creation. If a transaction needs to be reversed, a new transaction of type REVERSED is created.

**TransactionPin**
id (UUID v7), userId (FK → User, unique), pinHash, failedAttempts (default 0), lockedUntil (nullable), createdAt, updatedAt

**Settlement**
id (UUID v7), periodStart, periodEnd, totalAmount (BIGINT in kobo), transactionCount, status (PENDING | COMPLETED), triggeredBy (FK → User — admin who ran it), createdAt, completedAt

**Notification**
id (UUID v7), userId (FK → User), title, body, type (CREDIT | DEBIT | SYSTEM), isRead, relatedTransactionId (nullable), createdAt

**RefreshToken**
id (UUID v7), userId (FK → User), tokenHash, expiresAt, isRevoked, createdAt

### 8.3 Migration Strategy

TypeORM migrations are the only permitted way to change the database schema. `synchronize: false` is set in all environments including local development. Every schema change requires a written migration file that is committed to source control and reviewed before deployment.

Migration files are named with a timestamp prefix: `1727649000000-CreateUsersTable.ts`. They run automatically on application startup in the order of their timestamps. Rollback migrations must be written for every forward migration.

### 8.4 Indexing Strategy

Indexes are declared on the TypeORM entities and reflected in migration files:

- `users.email` — unique index, supports login lookup
- `wallets.userId` — unique index, supports wallet lookup by user
- `transactions.walletId` — non-unique index, supports history queries
- `transactions.referenceId` — non-unique index, supports linking debit/credit pairs
- `transactions.createdAt` — non-unique index, supports date-range settlement queries
- `transactions.status` + `transactions.settlementId` — composite index, supports unsettled transaction aggregation

---

## 9. Security Architecture

### 9.1 Authentication Architecture

**Registration:** bcrypt (cost 12) hashes the password. UUID v7 generates the user ID. The wallet is created in the same database transaction as the user — if wallet creation fails, user creation rolls back. JWT access token (15 min expiry, RS256) and refresh token (7 days, stored as bcrypt hash in the database) are issued.

**Login:** bcrypt.compare verifies the password. On success, a new access/refresh token pair is issued. The previous refresh token is not invalidated on login — only on logout or rotation.

**Refresh:** The incoming refresh token is hashed and compared against the stored hash. If valid and not expired, a new access/refresh pair is issued and the old refresh token is marked revoked. This is refresh token rotation — each token can only be used once.

**Logout:** The refresh token is marked revoked in the database. The access token is not invalidated (it expires in 15 minutes naturally — there is no token blacklist because that would require a database or Redis lookup on every request, adding latency to the entire API).

### 9.2 Transaction PIN Architecture

The transaction PIN is a 4-digit code used to authorise transfers. It is separate from the login password.

PIN is stored as a bcrypt hash (cost 12) in the TransactionPin table, not the Users table. Failed PIN attempts are tracked in the TransactionPin record. After 3 failed attempts, the lockedUntil field is set to 30 minutes in the future. PIN verification checks lockedUntil before attempting bcrypt comparison.

On mobile, the PIN input uses a hidden `type="tel"` input that captures the native numeric keyboard, with custom-styled display boxes that show filled dots. This approach uses the browser's native secure input rather than a custom keypad.

### 9.3 Idempotency Architecture

Transfer and funding endpoints require an `x-idempotency-key` header. This is a client-generated UUID that uniquely identifies a specific request attempt.

On receipt, the middleware checks Redis for the key. If found, the cached response is returned immediately and the business logic is not executed. If not found, the request proceeds, and after successful completion, the response is stored in Redis under the idempotency key with a 24-hour TTL.

If a client times out and retries with the same idempotency key, they receive the same response as the original request without a duplicate transfer being processed. This is a real production fintech requirement.

### 9.4 OWASP Top 10 Mitigations

**A01 — Broken Access Control:** RolesGuard on every admin route. User ID extracted from JWT, not from request body — users cannot impersonate other users by passing a different ID.

**A02 — Cryptographic Failures:** RS256 JWT, bcrypt for passwords and PINs, AES-256-GCM for any field-level encryption, HMAC-SHA512 for Paystack webhook verification, HTTPS enforced via HSTS header.

**A03 — Injection:** TypeORM parameterised queries exclusively. eslint-plugin-security flags raw query patterns at lint time. ValidationPipe with `whitelist: true` kills prototype pollution.

**A04 — Insecure Design:** Double-entry bookkeeping prevents balance manipulation. Insert-only transaction table prevents audit trail tampering. Idempotency prevents duplicate transaction processing.

**A05 — Security Misconfiguration:** Zod env validation refuses startup with insecure config. Helmet sets all security headers. CORS explicit origin whitelist. No default credentials permitted.

**A06 — Vulnerable Components:** pnpm audit in CI fails the build on high-severity CVEs. secretlint on every commit. All dependencies pinned to exact versions.

**A07 — Authentication Failures:** Generic error messages on auth failure (no user enumeration). Account lockout on PIN failures. Short-lived access tokens. Refresh token rotation.

**A08 — Software and Data Integrity Failures:** Webhook HMAC-SHA512 verification before processing any Paystack event. GitHub Actions CI runs before any code reaches main branch. No inline scripts in HTML (CSP).

**A09 — Logging and Monitoring Failures:** Every request logged with requestId, userId, route, duration, statusCode. Every error logged with full context. @nestjs/observe APM. No PII in logs.

**A10 — Server-Side Request Forgery:** No user-supplied URLs are fetched by the backend. Paystack integration calls only the hardcoded Paystack API hostname.

---

## 10. Observability Architecture

### 10.1 @nestjs/observe Setup

NestJS 12's native APM SDK. Auto-instruments every controller method, service method, guard, interceptor, and pipe — each becomes a traced span. TypeORM queries are instrumented as child spans. Outbound HTTP calls (Paystack API) are instrumented as child spans.

Configured at bootstrap with `appKey` and `appSecret` from environment variables. Free tier: 300,000 events per month, 3-day trace retention. No payment required.

### 10.2 Custom Metrics

Beyond auto-instrumentation, the following custom metrics are pushed manually from service methods:

- `transfer.initiated` — counter, increments on every transfer attempt
- `transfer.completed` — counter, increments on successful transfer
- `transfer.failed` — counter, increments on failed transfer (with reason label)
- `wallet.funded` — counter, increments on successful Paystack webhook credit
- `transfer.amount_kobo` — gauge, records the amount of each transfer
- `paystack.webhook.received` — counter, increments on every webhook receipt
- `paystack.webhook.verified` — counter, increments on HMAC verification success
- `paystack.webhook.rejected` — counter, increments on HMAC verification failure

The ratio of `transfer.initiated` to `transfer.completed` to `transfer.failed` gives immediate visibility into payment health.

### 10.3 Pino Logger Configuration

Pino is the fastest Node.js structured logger, significantly outperforming Winston in throughput benchmarks. In a high-throughput payment API, logging is on the critical path — slow logging adds latency to every request.

In production, Pino outputs JSON to stdout. Render captures stdout and ships it to its log aggregator. In development, `pino-pretty` formats the JSON as human-readable coloured output.

`nestjs-pino` wraps Pino into NestJS's Logger interface, so the same logger is used everywhere in the app. It automatically propagates the `x-request-id` from the request context into every log line emitted within that request's lifecycle.

Log levels: `error` for exceptions, `warn` for degraded states (PIN lockout, rate limit hit), `info` for significant business events (transfer completed, webhook received), `debug` for development tracing (disabled in production).

No PII ever appears in a log line. UserIds (UUIDs) are logged. Email addresses, names, phone numbers, and account numbers are never logged.

---

## 11. Infrastructure & Deployment

### 11.1 Domain Map

```
zeedle.com              → apps/web    (Vercel)
admin.zeedle.com        → apps/admin  (Vercel)
api.zeedle.com          → apps/api    (Render)
```

`api.zeedle.com` is a custom domain mapped to the Render service URL. This is set up in Render's dashboard under the service's custom domain settings, with a CNAME record added at the DNS registrar.

### 11.2 Local Development Stack

Docker Compose runs the following services for local development:

- `api` — the NestJS application container, built from `apps/api/Dockerfile`
- `web` — the consumer Next.js app, built from `apps/web/Dockerfile`
- `admin` — the admin Next.js app, built from `apps/admin/Dockerfile`
- `postgres` — PostgreSQL 16 official image, port 5432
- `redis` — Redis 7 Alpine image, port 6379

Environment variables are loaded from `.env.development` files in each app directory. The Docker Compose network allows the API container to resolve `postgres` and `redis` as hostnames.

### 11.3 Render Deployment (API)

Render hosts the NestJS API. The free tier runs on a shared instance that spins down after 15 minutes of inactivity. The first request after spin-down has approximately 30 seconds of cold start latency. This is acceptable for a portfolio project and is documented in README.md.

**Zero-downtime configuration on Render:**

Render supports health check endpoints. When a new deployment is triggered, Render spins up the new container and begins polling `/health`. Only when the health check returns 200 does Render switch traffic from the old container to the new one. The old container continues to serve in-flight requests until they complete, then shuts down.

NestJS `app.enableShutdownHooks()` catches the SIGTERM signal sent by Render during shutdown. The app stops accepting new connections, waits for in-flight requests to complete, then exits cleanly. This prevents any request from being dropped mid-execution during a deployment.

**render.yaml:**
Defines the service type, build command, start command, health check path, and environment variable references. This file lives in the repo root and enables infrastructure-as-code for the Render service.

### 11.4 Vercel Deployment (Frontend Apps)

Both `apps/web` and `apps/admin` are connected to separate Vercel projects. Each project is configured with its root directory pointing to the respective app folder.

Vercel deployments are atomic — the new version is fully built before any traffic switches to it. Rollback is one click in the Vercel dashboard.

Preview deployments are automatically created for every pull request, allowing frontend changes to be reviewed at a unique URL before merging.

Environment variables are set per Vercel project in the Vercel dashboard, not in committed files.

### 11.5 GitHub Actions CI/CD

**On every pull request (ci.yml):**
1. Install dependencies with `pnpm install --frozen-lockfile`
2. Run secretlint — fails immediately if secrets detected in changed files
3. Run `turbo lint` — ESLint + eslint-plugin-security across all packages
4. Run `turbo type-check` — TypeScript compilation check (tsc --noEmit) across all packages
5. Run `turbo test` — Vitest test suite across all packages
6. Run `pnpm audit --audit-level high` — fails on high-severity CVEs
7. Run `turbo build` — ensures everything builds without errors

All 7 steps must pass before a PR can be merged to main.

**On merge to main (deploy.yml):**
1. All CI steps above
2. Build and push Docker image to GitHub Container Registry
3. Trigger Render deploy hook (Render pulls new image and deploys)
4. Vercel deploys automatically on main branch push (configured in Vercel dashboard)

### 11.6 Cloud Platform Mapping (README Documentation)

Zeedle is deployed on Render and Vercel. For production fintech deployment, the equivalent AWS and GCP services are documented in README.md:

| Zeedle (Portfolio) | AWS Equivalent | GCP Equivalent |
|---|---|---|
| Render (API) | ECS Fargate / Elastic Beanstalk | Cloud Run |
| Vercel (Frontend) | S3 + CloudFront | Firebase Hosting |
| Neon PostgreSQL | RDS PostgreSQL | Cloud SQL |
| Upstash Redis | ElastiCache | Memorystore |
| GitHub Actions | CodePipeline | Cloud Build |
| Environment variables | Secrets Manager | Secret Manager |
| @nestjs/observe | CloudWatch + X-Ray | Cloud Monitoring + Cloud Trace |

This mapping demonstrates cloud architecture awareness to hiring managers who see Render/Vercel in the repository.

---

## 12. Design System

### 12.1 Design Philosophy

Trust is the primary emotion that Zeedle's design must communicate. Every decision — colour, spacing, type, motion — is made to make users feel their money is safe and the platform is reliable. This means restraint over decoration, precision over creativity, calm over excitement.

Dark mode is the primary design. The Nigerian fintech market (Moniepoint, Kuda, Opay) has moved dark-first. Financial data — green credits, red debits — reads with more contrast on dark surfaces than on white.

Typography carries the personality. Inter is used throughout — it is optimised for screen legibility at small sizes, has excellent numeric character spacing, and reads as professional without being corporate. No display fonts. No decorative typefaces.

### 12.2 Colour Tokens

Background layers:
- `--bg-base: #0A0A0F` — near-black page background
- `--bg-surface: #111118` — card and panel surfaces
- `--bg-elevated: #1C1C27` — dropdown, modal, hover state surfaces
- `--bg-hover: #22223A` — hover state for interactive elements

Brand:
- `--brand: #5B6EF5` — indigo-blue, primary CTA
- `--brand-dim: #3D4FCC` — hover state for brand buttons
- `--brand-glow: rgba(91,110,245,0.12)` — subtle brand tint for active states

Semantic (financial):
- `--credit: #22C55E` — green, incoming money, success
- `--credit-bg: rgba(34,197,94,0.10)` — credit icon backgrounds, badges
- `--debit: #F43F5E` — rose-red, outgoing money, danger
- `--debit-bg: rgba(244,63,94,0.10)` — debit icon backgrounds, badges
- `--pending: #F59E0B` — amber, pending states, admin badge
- `--pending-bg: rgba(245,158,11,0.10)` — pending badge backgrounds

Text:
- `--text-primary: #F4F4F6` — primary content
- `--text-secondary: #9898A8` — labels, supporting text
- `--text-muted: #5A5A6E` — timestamps, metadata, placeholders

Borders:
- `--border: #1E1E2E` — default hairline
- `--border-strong: #2A2A3E` — card borders, input borders

### 12.3 Typography Scale

Font family: Inter (loaded from Google Fonts)

All monetary figures use `font-variant-numeric: tabular-nums`. This aligns digits vertically in transaction lists — a standard fintech table behaviour that is almost never implemented in tutorial projects. It signals real financial UI awareness.

Scale:
- Balance hero: 34px desktop / 28px mobile, weight 700
- Page title: 20px desktop / 18px mobile, weight 600
- Card title: 15px, weight 600
- Body: 14px, weight 400 — does not change across breakpoints
- Label: 12px, weight 500
- Metadata: 11px, weight 400

### 12.4 Spacing System

All spacing uses an 8pt grid. No arbitrary values.

- 4px — gap between label and value
- 8px — tight internal gaps
- 12px — between related elements
- 16px — standard unit, mobile page padding
- 20px — card internal padding (mobile)
- 24px — card internal padding (desktop), section gaps
- 32px — desktop page padding
- 48px — major section breaks

### 12.5 Border Radius

- 6px — inputs, chips, small elements
- 9px — buttons, form inputs
- 12px — cards, panels
- 16px — modals, bottom sheets
- 9999px — pills, badges, avatars

### 12.6 Status Badge System

Every badge is a semi-transparent tinted pill — never a solid colour background.

- Completed: 10% opacity credit green background, credit green text
- Pending: 10% opacity amber background, amber text
- Failed: 10% opacity debit red background, debit red text
- Frozen: 12% opacity neutral background, neutral text

### 12.7 Button Variants

Three variants only. No ghost buttons, no outline buttons, no gradient buttons.

- Primary: brand blue background, white text — used for the single most important action per page
- Secondary: elevated background, primary text, strong border — used for secondary actions
- Danger: transparent background, debit-red border at 40% opacity, debit-red text — used for destructive actions (freeze account, delete)

Disabled state: 40% opacity, `cursor: not-allowed`. Never use `disabled` attribute alone — also handle it visually.

### 12.8 Empty States

No illustrations. No floating cartoon characters. Empty states are text and one call to action:

```
No transactions yet
Start by funding your wallet

[Fund Wallet]
```

Errors are direction-giving, never apologetic:

```
Transfer failed
Your PIN was incorrect. 2 attempts remaining.

[Try again]
```

---

## 13. Responsive Design Specification

### 13.1 Breakpoints

- Mobile: 320px – 639px
- Tablet: 640px – 1023px
- Desktop: 1024px – 1279px
- Wide: 1280px+

Consumer app is designed mobile-first — base styles target mobile, overrides target larger breakpoints. Admin dashboard is designed desktop-first — base styles target desktop, overrides handle smaller screens.

### 13.2 Consumer App Layout Across Breakpoints

**Desktop (1024px+)**
Fixed sidebar 200px wide. Main content takes remaining width. Sidebar shows icon + text label for each nav item. User avatar and name at bottom of sidebar.

**Tablet (640–1023px)**
Sidebar collapses to icon-only rail, 56px wide. Nav item text labels disappear. Icons remain. Tooltip on hover shows the label. Main content expands to fill remaining width. No hamburger menu — the rail is always visible.

**Mobile (under 640px)**
Sidebar completely removed. Bottom navigation bar appears, fixed to viewport bottom, 60px tall. Five items: Home, Transactions, Send, Fund, Settings. `padding-bottom: env(safe-area-inset-bottom)` applied to account for iPhone home indicator. Each nav item minimum tap target 44×44px.

### 13.3 Admin Dashboard Layout Across Breakpoints

**Wide desktop (1280px+)**
Sidebar 240px. Stat cards in single row of four. Charts side by side in two columns.

**Desktop (1024–1279px)**
Sidebar 200px. Stat cards in 2×2 grid. Charts stacked vertically.

**Tablet (768–1023px)**
Sidebar becomes a slide-in drawer. Topbar appears with hamburger button. Stat cards remain 2×2. Tables use horizontal scroll containers. Charts stacked vertically.

**Mobile (under 768px)**
Single column layout. Stat cards stack to single column. Tables use horizontal scroll or card-list alternative (user table on mobile becomes a card list — see section 13.8). Admin actions remain accessible but the layout optimises for reading, not writing.

### 13.4 Stat Cards Responsive Grid

```
Wide desktop:   4 columns  [Vol] [Txns] [Users] [Failed]
Desktop/tablet: 2 columns  [Vol]  [Txns]
                           [Users][Failed]
Mobile:         1 column   [Vol]
                           [Txns]
                           [Users]
                           [Failed]
```

### 13.5 Typography Scaling

Balance figure scales: 28px mobile → 34px desktop. This is the only element with dramatic type scaling. All other type sizes are fixed — body text at 14px works across all breakpoints for a fintech application.

### 13.6 Wallet Card Actions Responsive Behaviour

On mobile: Send and Fund Wallet buttons stack vertically, full width — easier to tap on a narrow screen.
On tablet and desktop: buttons sit side by side, auto-width.

### 13.7 Tap Target Rules

Every interactive element on mobile must have a minimum 44×44px touch target per Apple HIG (48×48dp per Material Design). Visual elements smaller than this (icons, eye toggle, back arrow) get invisible padding extensions. The technique is: apply padding equal to `(44 - visual size) / 2` on each side, then apply the negative equivalent as margin so the layout is not disturbed.

### 13.8 Transaction List Responsive Layout

Desktop row: `[icon] [name + date] [reference] [amount + status]`
Mobile row: `[icon] [name] [amount]` on top line, `[date] [status]` on bottom line

The reference column is hidden on mobile — it is not useful to consumers. The layout shift is achieved with a single flexible div structure rather than two separate components.

### 13.9 Admin Table Strategy

**Transactions table:** Horizontal scroll container on mobile and tablet. `min-width: 640px` on the table forces scroll before column collapse. A right-edge gradient shadow signals that the table is scrollable.

**Users table:** Dual presentation. Table on desktop (md and above). Card list on mobile (below md). Each user becomes a card showing name, email, balance, and status with a View button. This is more readable than a tiny scrolling table for a list of individual records.

### 13.10 PIN Input Mobile Strategy

On mobile, a hidden `type="tel"` input is placed over the PIN boxes. Tapping anywhere on the PIN box area focuses the hidden input and opens the native numeric keyboard. The visible PIN boxes are display-only — they respond to the hidden input's value. This approach leverages the native secure keyboard rather than a custom keypad.

### 13.11 Bottom Sheet vs Modal

Transfer confirmation and all confirmation flows use a centered modal on desktop and a bottom sheet on mobile. The bottom sheet slides up from the bottom edge, has rounded top corners only, and includes a drag handle (a short pill-shaped bar) at the top.

### 13.12 Admin Drawer (Tablet)

An overlay backdrop appears behind the drawer. Clicking the backdrop or any nav item closes the drawer. The drawer slides in from the left with a 200ms ease-out transition. This is CSS transform-based — no JavaScript layout recalculation.

---

## 14. Step-by-Step Build Plan

### Phase 0 — Repository Foundation

**Step 1: Initialise the repository**
Create a new directory named `zeedle`. Initialise a git repository. Create the `.gitignore` file covering `node_modules`, `.env*` (excluding `.env.example`), `dist`, `.turbo`, `.next`. Create a GitHub repository and push the initial commit.

**Step 2: Set up pnpm workspace**
Install pnpm globally if not present. Create `pnpm-workspace.yaml` declaring `apps/*` and `packages/*`. Create `package.json` at the root with private true, engines specifying Node 22, and devDependencies for turbo, prettier, husky, lint-staged, secretlint.

**Step 3: Configure Turborepo**
Create `turbo.json` at the root. Define tasks: build (dependsOn ^build, outputs dist/**), dev (cache false, persistent true), test (dependsOn ^build), lint (no dependencies). Run `pnpm install` to install root devDependencies.

**Step 4: Set up shared config package**
Create `packages/config/`. Create `package.json` with name `@zeedle/config`. Create `tsconfig.base.json` with strict mode, exactOptionalPropertyTypes, no implicit any, module ESNext, target ES2022. Create `eslint-base.js` extending typescript-eslint recommended and importing eslint-plugin-security. Create `prettier.config.js` with single quotes, trailing commas, print width 100.

**Step 5: Set up shared-types package**
Create `packages/shared-types/`. Create `package.json` with name `@zeedle/shared-types`, dependency on zod. Create `src/` with `auth.ts`, `wallet.ts`, `transfer.ts`, `transaction.ts`, `enums.ts`, `index.ts`. Write all Zod schemas and TypeScript type exports. All schemas go here before any app code is written.

**Step 6: Configure Git hooks**
Run `pnpm exec husky init`. Configure `.husky/pre-commit` to run lint-staged and secretlint. Configure `lint-staged` in root `package.json` to run ESLint on changed TypeScript files. Configure secretlint with `.secretlintrc.json` to scan for AWS keys, GitHub tokens, generic API keys, and connection strings.

---

### Phase 1 — Backend Scaffold

**Step 7: Generate the NestJS application**
Inside `apps/`, run `pnpm exec nestjs new api --package-manager pnpm`. Select ESM when prompted. Select Fastify as the HTTP adapter. The CLI generates the base structure with `vitest.config.ts` automatically for ESM projects.

**Step 8: Configure TypeScript for the API**
Replace the generated `tsconfig.json` to extend `@zeedle/config/tsconfig.base.json`. Set `rootDir` to `src`, `outDir` to `dist`. Add path aliases for `@core/*`, `@common/*`, `@modules/*`, `@infrastructure/*`.

**Step 9: Install all backend dependencies**
Install production dependencies in `apps/api`: `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-fastify`, `@nestjs/jwt`, `@nestjs/config`, `@nestjs/observe`, `@nestjs/typeorm`, `typeorm`, `pg`, `ioredis`, `@upstash/redis`, `@upstash/ratelimit`, `bcrypt`, `class-validator`, `class-transformer`, `sanitize-html`, `axios`, `axios-retry`, `zod`, `pino`, `nestjs-pino`, `@fastify/helmet`, `@fastify/cors`, `@zeedle/shared-types`.

Install devDependencies: `@nestjs/testing`, `@nestjs/cli`, `@types/bcrypt`, `@types/sanitize-html`, `@faker-js/faker`, `supertest`, `@types/supertest`, `pino-pretty`, `@vitest/coverage-v8`, `eslint-plugin-security`.

**Step 10: Configure environment validation**
Create `core/config/`. Write a Zod schema validating all required environment variables: `NODE_ENV`, `PORT`, `DATABASE_URL`, `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `PAYSTACK_SECRET`, `PAYSTACK_WEBHOOK_SECRET`, `REDIS_HOST` (dev), `REDIS_PORT` (dev), `UPSTASH_REDIS_REST_URL` (prod), `UPSTASH_REDIS_REST_TOKEN` (prod). The application bootstrapper must validate this schema before anything else — if validation fails, log the validation errors and `process.exit(1)`.

**Step 11: Set up the database module**
Create `core/database/`. Write TypeORM configuration using the validated environment. Set `synchronize: false` unconditionally. Set SSL to `{ rejectUnauthorized: false }` for Neon compatibility. Configure connection pool: poolSize 10, connectTimeoutMS 10000. Import TypeORM `forRootAsync` in `CoreModule` using the config service.

**Step 12: Set up the Redis module**
Create `core/redis/`. Write the `IRedisService` interface with `get`, `set`, `del`, `exists`, `incr`, `expire` methods. Write `LocalRedisService` implementing the interface using ioredis. Write `UpstashRedisService` implementing the interface using @upstash/redis. Write `RedisModule.forRoot()` dynamic module that injects the correct provider based on `NODE_ENV`. Export with the token `REDIS_SERVICE`.

**Step 13: Set up Pino logger**
Configure `nestjs-pino` in `CoreModule`. In development, pipe output through `pino-pretty`. In production, output raw JSON. Set `autoLogging` with a custom serialiser that removes any field named `password`, `pin`, `pinHash`, `passwordHash`, `email`, `phone` from log output. Set `genReqId` to extract `x-request-id` from the incoming request or generate a new UUID.

**Step 14: Write global middleware and filters**
Write `RequestIdMiddleware` applying to all routes. Write `GlobalExceptionFilter` mapping all exceptions to RFC 7807 Problem Details format with `type`, `title`, `status`, `detail`, `instance` fields. Write `TransformResponseInterceptor` wrapping all successful responses in `{ success: true, data, meta: { requestId, timestamp } }`. Register all globally in `main.ts`.

**Step 15: Configure Fastify and security headers**
In `main.ts`, create the app with `NestFactory.create<NestFastifyApplication>`. Register `@fastify/helmet` with a CSP policy. Register `@fastify/cors` with explicit origin array from environment. Enable `app.enableShutdownHooks()`. Create and expose `/health` endpoint. Start listening on `0.0.0.0:PORT`.

---

### Phase 2 — Database Schema & Migrations

**Step 16: Write all entity classes**
Create entity files in each module's `entities/` folder for User, Wallet, Transaction, TransactionPin, Settlement, Notification, RefreshToken. Apply TypeORM decorators. Apply class-transformer `@Exclude()` to `passwordHash` and `pinHash` on their entities. Do not add `updatedAt` to Transaction entity.

**Step 17: Generate and review initial migrations**
Run TypeORM migration generation to produce the initial schema migration. Review the generated SQL to verify: BIGINT type on all kobo amount columns, UUID v7 generation, all foreign key constraints, all indexes. Create a separate migration file adding all custom indexes (transactions.walletId, transactions.referenceId, transactions.createdAt, composite index on status+settlementId).

**Step 18: Write seed data**
Create a seed script that creates one admin user, one test consumer user, and seed transactions. This runs via `pnpm seed` and is used for local development and UI testing. The seed script uses the same entity classes as production — no raw SQL.

---

### Phase 3 — Core Domain Modules

**Step 19: Build the auth module**
Write registration endpoint: validate DTO, hash password, create user and wallet in a single QueryRunner transaction (if wallet creation fails, user creation rolls back). Issue JWT pair on success. Write login endpoint: validate credentials, check isActive, issue JWT pair. Write refresh endpoint: validate refresh token, rotate. Write logout endpoint: revoke refresh token. Write all auth DTOs with class-validator decorators and class-transformer sanitisation transforms.

**Step 20: Build the users module**
Write profile GET endpoint returning UserResponseDto (excludes password, pin). Write profile PATCH endpoint. Write PIN creation and PIN change endpoints. Write account deletion endpoint: anonymises PII fields, does not delete transaction records, sets isDeleted flag.

**Step 21: Build the wallets module**
Write GET /wallets/me returning current user's wallet balance in kobo plus the formatted naira display value. Write wallet repository with `findByUserId` and `updateBalance` methods. `updateBalance` uses a QueryRunner provided by the caller — it never opens its own transaction.

**Step 22: Build the payments module**
Write `POST /payments/fund/initialize`: calls Paystack Initialize Transaction API, returns checkout URL. Write `POST /payments/webhook`: verifies HMAC-SHA512 signature, processes verified events (charge.success), credits wallet, creates transaction record, creates notification. Write the Paystack infrastructure adapter wrapping axios calls to the Paystack API.

**Step 23: Build the transfers module**
Write `POST /transfers`: validate DTO (recipientId, amount in naira, PIN, optional narration), convert amount to kobo, check idempotency key, verify PIN (check lockout first), open QueryRunner transaction, debit sender wallet, credit recipient wallet, create two transaction records with shared referenceId, commit, store idempotency key in Redis, create notifications, return success. If any step throws, rollback QueryRunner.

**Step 24: Build the transactions module**
Write `GET /transactions`: paginated, filtered by type and status and date range. Write `GET /transactions/:id`: single transaction detail. Both return data from the transaction repository with wallet ownership validation (users can only see their own transactions).

**Step 25: Build the settlements module**
Write `POST /settlements/run` (admin only): accepts date range, aggregates unsettled transactions, creates settlement batch record, marks transactions as settled, returns summary. Write `GET /settlements` (admin only): paginated settlement history.

**Step 26: Build the notifications module**
Write `GET /notifications`: paginated unread notifications for the current user. Write `PATCH /notifications/:id/read`: marks notification as read. Notification creation is an internal method called by transfers, payments, and settlements modules — no public creation endpoint.

---

### Phase 4 — Security & Guards

**Step 27: Write JwtAuthGuard**
Implement `CanActivate`. Extract Bearer token from Authorization header. Use `@nestjs/jwt` JwtService to verify with the RS256 public key. Attach decoded payload to `request.user`. Handle missing token (401), invalid signature (401), and expired token (401) with identical generic error messages to prevent information leakage.

**Step 28: Write RolesGuard**
Implement `CanActivate`. Read the `@Roles()` decorator metadata from the route handler. Compare against `request.user.role`. Return 403 with a generic message if insufficient.

**Step 29: Write RateLimitGuard**
Implement `CanActivate`. Use `@upstash/ratelimit` in production, a simple in-memory Map with TTL in development. Define three rate limit tiers: auth (5/min), payments (10/min), general (100/min). Apply the correct tier based on the route path. Return 429 with `Retry-After` header on limit breach.

**Step 30: Write IdempotencyMiddleware**
Apply to POST /transfers and POST /payments/fund/initialize. Check `x-idempotency-key` header. If missing, return 400 with guidance. If key exists in Redis, return 200 with cached response. If key absent, set a flag on the request and let it proceed. After the route handler, store the response in Redis under the key with 24h TTL.

**Step 31: Write SanitizationPipe**
Implement NestJS PipeTransform. Use class-transformer to apply transforms. Trim all string fields. Strip HTML from narration fields using sanitize-html with allowedTags []. Floor all numeric fields to integer. Apply after ValidationPipe globally.

**Step 32: Write PIN lockout logic**
In the transaction PIN verification method in users.repository.ts: before bcrypt.compare, check if lockedUntil is set and has not passed (return 423 Locked). On failed comparison: increment failedAttempts. If failedAttempts reaches 3: set lockedUntil to 30 minutes in the future, reset failedAttempts to 0. On successful comparison: reset failedAttempts to 0.

---

### Phase 5 — Tests

**Step 33: Write unit tests for all services**
Each service file has a corresponding `.spec.ts` file in the `tests/` folder. Tests use `@nestjs/testing` Test.createTestingModule. Repositories are mocked with `vitest.fn()`. Tests cover: happy path, validation failures, database errors (simulate with mock throws), edge cases (zero balance transfer, concurrent transfer attempts via idempotency). Target: 80% line coverage.

**Step 34: Write E2E tests for critical flows**
Write supertest-based E2E tests in `test/` at the app level. Tests boot the full NestJS application against a test database (separate Neon database or local Docker postgres). Critical flows to cover: full registration → fund → transfer flow, failed transfer on insufficient balance, duplicate transfer blocked by idempotency, webhook with invalid HMAC rejected, admin endpoint rejected with user JWT.

**Step 35: Verify CI test pipeline**
Push a branch and verify all GitHub Actions steps pass. Verify that a deliberate test failure causes the pipeline to fail. Verify that a deliberate lint error causes the pipeline to fail. Verify that committing a fake API key causes secretlint to fail.

---

### Phase 6 — Frontend Scaffold

**Step 36: Scaffold consumer app**
Inside `apps/`, create `web/` with a Next.js 15 project using the App Router. Configure `next.config.ts` with the API base URL as an environment variable. Install: `tailwindcss` v4, `shadcn/ui` CLI (run init), `@tanstack/react-query`, `zustand`, `react-hook-form`, `@hookform/resolvers`, `zod`, `ky`, `recharts`, `clsx`, `tailwind-merge`. Add `@zeedle/shared-types` as a workspace dependency.

**Step 37: Scaffold admin app**
Inside `apps/`, create `admin/` with a Next.js 15 project. Same dependency setup as consumer app. This is a separate project — separate `package.json`, separate Tailwind config, separate Vercel project.

**Step 38: Configure Tailwind design tokens**
In both apps, configure Tailwind CSS v4 with the Zeedle design system tokens as CSS custom properties in the global stylesheet. All colour tokens, spacing scale, border radius values, and typography scale defined as CSS variables matching the design system specification.

**Step 39: Write the Zustand auth store**
Write a Zustand store holding: `user` (the decoded JWT payload), `accessToken` (string, in memory), `setAuth(user, token)`, `clearAuth()`. The access token is never written to localStorage, sessionStorage, or any persistent storage. It lives only in Zustand (memory) for the current browser session. On page reload, the user is not logged out — the refresh token in the httpOnly cookie is used to get a new access token transparently on the first API call.

**Step 40: Configure ky HTTP client**
Write an `api` ky instance configured with the API base URL. Add a before-request hook attaching `Authorization: Bearer {accessToken}` from the Zustand store. Add an after-response hook: if the response is 401, attempt a token refresh, update the Zustand store with the new token, and retry the original request once. If the refresh fails, call `clearAuth()` and redirect to login.

**Step 41: Configure TanStack Query**
Wrap both apps in a `QueryClientProvider`. Configure a default query client: `staleTime` 30 seconds for balance queries, 2 minutes for transaction history. Retry false on 4xx responses (don't retry client errors). Retry 3 times with exponential backoff on 5xx responses.

**Step 42: Write Next.js middleware for route protection**
In both apps, write `middleware.ts` checking for a valid access token. For the consumer app: redirect to /login if no token. For the admin app: redirect to /login if no token; redirect to /overview if token is present but role is not ADMIN. The middleware runs on every request to protected routes.

---

### Phase 7 — Consumer App Pages

**Step 43: Build auth pages**
Build `/login` page with React Hook Form + LoginSchema from shared-types. Build `/register` page with RegisterSchema. Both pages use the ky instance to call the API. On success, set auth in Zustand and redirect to /dashboard.

**Step 44: Build the dashboard page**
Build `/dashboard`. Fetch wallet balance with TanStack Query (staleTime 30s, refetchOnWindowFocus true — balance always fresh when user returns to tab). Fetch recent transactions (last 5). Display the wallet card with balance, hide/show toggle, Send and Fund buttons. Display the recent transaction list.

**Step 45: Build the transfer flow**
Build `/transfer` with recipient ID input (debounced API call to resolve recipient name on valid ID), amount input (formatted as naira as user types), optional narration input. Continue button disabled until recipient resolved and amount > 0.

Build `/transfer/confirm` with transfer summary and PIN input. PIN uses the hidden `type="tel"` strategy for mobile keyboard. On submit, call the transfer mutation. On success, show the success state. On PIN error, show attempt count remaining.

**Step 46: Build the fund wallet page**
Build `/fund`. Amount input. Quick amount chips (₦1,000, ₦5,000, ₦10,000, ₦20,000, ₦50,000, ₦100,000). Security notice about Paystack redirect. On submit, call the initialize funding mutation and redirect to the returned Paystack checkout URL.

**Step 47: Build the transaction history page**
Build `/transactions`. Table with type, description, reference, date, amount, status columns. Filter controls for type and date range. Pagination. Click a row to open a transaction detail panel (drawer on desktop, bottom sheet on mobile) with full details and a download receipt button.

**Step 48: Build the settings page**
Build `/settings`. Profile display and edit form. PIN change form (current PIN, new PIN, confirm new PIN). Account deletion with a confirmation flow (type "DELETE" to confirm).

**Step 49: Build the global error boundary**
Write `app/error.tsx` as a Client Component. Detect chunk load failure error messages (`Loading chunk`, `Failed to fetch dynamically imported module`). Call `window.location.reload()` on detection. For all other errors, show a generic error card with a retry button.

---

### Phase 8 — Admin App Pages

**Step 50: Build admin login page**
Separate login page for the admin app. Same form structure as consumer login. On success, verify that the JWT payload contains `role: ADMIN` before setting auth — if the role is USER, reject with an error message.

**Step 51: Build the admin overview page**
Build `/overview`. Four stat cards: total volume (₦), transfer count, active user count, failed transaction count. Each card shows a trend indicator (% change vs previous period). Two charts using Recharts: transaction volume line chart (last 30 days), daily active users bar chart. Recent transactions table (last 10 across all users).

**Step 52: Build the admin users page**
Build `/users`. Search input (debounced). Data table: name with avatar initials, email, wallet balance, join date, status badge, View action button. Responsive: table on md+, card list on mobile. User detail drawer/panel: full user record, wallet balance, transaction history, Freeze Account / Reactivate Account action button.

**Step 53: Build the admin transactions page**
Build `/transactions`. Full platform transaction history with type and status filters. Horizontal scroll on mobile. Reference column visible to admin (hidden from consumer). Click to see transaction detail.

**Step 54: Build the admin settlements page**
Build `/settlements`. Settlement hero card showing current unsettled period, total unsettled amount, transaction count, and a Run Settlement button. Settlement summary card showing total credits, total debits, net position. Settlement history table.

---

### Phase 9 — Containerisation

**Step 55: Write the API Dockerfile**
Multi-stage build. Stage 1 (deps): install all dependencies including devDependencies, needed for the build step. Stage 2 (build): copy source, run `turbo build` for the API, compile TypeScript to dist. Stage 3 (production): Node 22 Alpine base, copy only production dependencies and the compiled dist folder. No devDependencies in the final image. Run as non-root user. Expose PORT. CMD to run the compiled main.js.

**Step 56: Write docker-compose.yml**
Define four services: api (builds from apps/api Dockerfile, mounts .env.development), web (Next.js dev server), postgres (postgres:16-alpine, persistent volume, init SQL to create the database), redis (redis:7-alpine). Define a custom network. Web and api services can reach postgres and redis by their service names as hostnames.

**Step 57: Write render.yaml**
Define the Render web service: name, runtime (docker), Dockerfile path, health check path (/health), environment variable references. This enables infrastructure-as-code for the Render deployment.

---

### Phase 10 — CI/CD

**Step 58: Write GitHub Actions CI workflow**
Create `.github/workflows/ci.yml`. Trigger on pull_request to main. Steps: checkout, setup pnpm, setup Node 22, install dependencies with frozen lockfile, run secretlint, run turbo lint, run turbo type-check, run turbo test with coverage, run pnpm audit, run turbo build. Cache pnpm store between runs using the pnpm store path.

**Step 59: Write GitHub Actions deploy workflow**
Create `.github/workflows/deploy.yml`. Trigger on push to main. Same steps as CI. Additional steps: build Docker image, tag with commit SHA, push to GitHub Container Registry, call Render deploy hook via curl. Vercel deploys automatically from the main branch (configured in Vercel dashboard, not in GitHub Actions).

**Step 60: Configure GitHub repository settings**
Set main branch as protected. Require CI workflow to pass before merging. Require at least one review (optional for solo project — can be skipped). Disable force push and deletion of the main branch.

---

### Phase 11 — Production Setup

**Step 61: Set up Neon database**
Create a Neon account. Create a project named `zeedle-production`. Copy the pooled connection string (the one with `-pooler` in the hostname). Store as `DATABASE_URL` in Render's environment variables.

**Step 62: Set up Upstash Redis**
Create an Upstash account. Create a Redis database in the closest available region. Copy the REST URL and REST token. Store as `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Render's environment variables.

**Step 63: Generate RS256 key pair**
Generate an RSA key pair locally. Store the private key as `JWT_PRIVATE_KEY` and the public key as `JWT_PUBLIC_KEY` in Render's environment variables. Never commit keys to the repository.

**Step 64: Set up Paystack**
Create a Paystack account. Navigate to Settings → API Keys. Copy the live secret key. Store as `PAYSTACK_SECRET`. Set the webhook URL to `https://api.zeedle.com/payments/webhook` in Paystack's dashboard. Copy the webhook secret and store as `PAYSTACK_WEBHOOK_SECRET`.

**Step 65: Deploy API to Render**
Create a new Render web service. Connect the GitHub repository. Set the root directory to `apps/api`. Set the Dockerfile path. Configure all environment variables. Set the health check path to `/health`. Deploy. Verify the health check endpoint returns 200. Verify the `/health` route is accessible at the Render-assigned URL.

**Step 66: Configure custom domain on Render**
Add `api.zeedle.com` as a custom domain in Render's dashboard. Add the CNAME record at the DNS registrar pointing `api` subdomain to the Render URL. Wait for DNS propagation and TLS certificate provisioning.

**Step 67: Run production migrations**
Once the API is deployed, trigger the migration runner via the Render shell or a one-off job. Verify all migration files run successfully. Verify the schema matches entity definitions.

**Step 68: Deploy frontend apps to Vercel**
Create two Vercel projects: `zeedle-web` and `zeedle-admin`. Connect each to the GitHub repository. Set the root directory for each project (`apps/web` and `apps/admin`). Add environment variable `NEXT_PUBLIC_API_URL=https://api.zeedle.com`. Deploy both. Assign custom domains: `zeedle.com` to the web project, `admin.zeedle.com` to the admin project.

**Step 69: Run production smoke tests**
Register a test user. Fund the wallet. Make a transfer. Verify transaction history. Log in to admin dashboard. Verify the test user appears. Run a settlement. Verify all flows work end to end in production.

---

### Phase 12 — Documentation & Portfolio Presentation

**Step 70: Write README.md**
Cover: project overview, technology decisions with rationale, local setup instructions (pnpm install, docker-compose up, pnpm migrate, pnpm seed, turbo dev), environment variable reference, cloud mapping table (Render → AWS/GCP), API endpoint reference, compliance notes (PCI-DSS alignment, NDPA 2023).

**Step 71: Write SECURITY.md**
Cover: threat model (what Zeedle protects against), security architecture overview, responsible disclosure process, known limitations (free tier cold starts, no full PCI-DSS certification for portfolio version).

**Step 72: Write PRIVACY_POLICY.md**
Cover: what data is collected, why it is collected, how long it is retained, user rights under NDPA 2023, the cross-border data transfer notice (US hosting), how to request deletion.

**Step 73: Write API documentation**
Use Swagger via `@nestjs/swagger` to auto-generate interactive API docs at `/api/docs`. Annotate all controllers and DTOs with Swagger decorators. The docs should be accessible in development and staging, disabled or password-protected in production.

---

## 15. Environment Variables Reference

### API (apps/api)

| Variable | Description | Example |
|---|---|---|
| NODE_ENV | Runtime environment | development / production |
| PORT | HTTP server port | 3000 |
| DATABASE_URL | Neon pooled connection string | postgresql://... |
| JWT_PRIVATE_KEY | RS256 private key for signing | -----BEGIN RSA... |
| JWT_PUBLIC_KEY | RS256 public key for verification | -----BEGIN PUBLIC... |
| JWT_ACCESS_EXPIRY | Access token lifetime | 15m |
| JWT_REFRESH_EXPIRY | Refresh token lifetime | 7d |
| PAYSTACK_SECRET | Paystack API secret key | sk_live_... |
| PAYSTACK_WEBHOOK_SECRET | Paystack webhook HMAC secret | whsec_... |
| PAYSTACK_BASE_URL | Paystack API base URL | https://api.paystack.co |
| REDIS_HOST | Local Redis hostname (dev only) | localhost |
| REDIS_PORT | Local Redis port (dev only) | 6379 |
| UPSTASH_REDIS_REST_URL | Upstash REST URL (prod only) | https://...upstash.io |
| UPSTASH_REDIS_REST_TOKEN | Upstash REST token (prod only) | AX... |
| OBSERVE_APP_KEY | @nestjs/observe app key | zeedle_... |
| OBSERVE_APP_SECRET | @nestjs/observe app secret | obs_... |
| CORS_ORIGINS | Allowed CORS origins (comma-separated) | https://zeedle.com,https://admin.zeedle.com |

### Consumer App (apps/web)

| Variable | Description | Example |
|---|---|---|
| NEXT_PUBLIC_API_URL | API base URL | https://api.zeedle.com |
| NEXT_PUBLIC_APP_ENV | Display environment indicator | production |

### Admin App (apps/admin)

| Variable | Description | Example |
|---|---|---|
| NEXT_PUBLIC_API_URL | API base URL | https://api.zeedle.com |
| NEXT_PUBLIC_APP_ENV | Display environment indicator | production |

---

*End of Zeedle Technical Requirements Document v1.0.0*
