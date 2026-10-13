# Zeedle

Peer-to-peer digital wallet for instant, zero-fee transfers between Nigerian users. NestJS API + two Next.js frontends (consumer + operations console), built to Stitch designs under the Obsidian Kinetic system.

Live: consumer at `https://zeedle.vercel.app`, admin console at `https://adminzeedle.vercel.app`, API at `https://zeedle.onrender.com`.

## Apps & packages

| Path | What | Port |
|---|---|---|
| `apps/api` | NestJS 12 + Fastify API (auth, wallets, transfers, settlements, admin) | 3000 |
| `apps/web` | Consumer wallet app (9 pages, Stitch) | 3001 |
| `apps/admin` | Operations console (overview, settlements, ledger, users) | 3002 |
| `packages/shared-types` | Zod contracts + shared DTOs (account numbers, transfers, pagination) | — |
| `packages/config` | Shared tsconfig/eslint base | — |

## Quick start

1. `pnpm install`
2. `docker compose up -d` (Postgres `:5433`, Redis `:6380`)
3. Copy `.env.example` → `apps/api/.env.development` and fill secrets (never commit it)
4. `pnpm --filter @zeedle/api seed` (dev admin `admin@zeedle.test` / `AdminPass123!`, consumer `user@zeedle.test` / `UserPass123!`)
5. Run what you need: `pnpm --filter @zeedle/api start:dev`, `pnpm --filter @zeedle/web dev`, `pnpm --filter @zeedle/admin dev`

Migrations run automatically on API boot (`migrationsRun: true`).

## Commands

| Command | Description |
|---|---|
| `pnpm --filter @zeedle/api start:dev` | API with watch |
| `pnpm --filter @zeedle/web dev` / `--filter @zeedle/admin dev` | Frontends |
| `pnpm --filter @zeedle/api test` | Unit tests (vitest) |
| `pnpm --filter @zeedle/api test:e2e` | E2E against the dev stack (DB + Redis must be up) |
| `pnpm --filter <pkg> lint` / `type-check` | ESLint / `tsc --noEmit` |
| `pnpm --filter @zeedle/api seed` | Dev seed data |

## App flows

**Consumer (`apps/web`)** — `/` redirects to `/dashboard`; middleware bounces
sessionless visitors to `/login` (register creates user + wallet + 10-digit
number in one shot). Dashboard shows balance, the account number with copy,
inflow/outflow cards, and recent activity. Send Money takes a 10-digit number
→ local check-digit validation → name resolve → amount → confirm screen with
PIN → receipt (recipient saved to Recents). Fund Wallet goes through Paystack
checkout and returns to `/fund?reference=` with a confirmation card; the
webhook credits the wallet. Transactions filters history; Settings manages
profile, PIN, sign-out, and account deletion. Sessions restore silently on
reload; dead sessions land on `/login`.

**Admin console (`apps/admin`)** — `/login` asserts `role === 'ADMIN'` after
authentication (non-admins get a hard lockout). Overview shows settled volume,
open unsettled window, and wallet counts from live metrics. Settlements runs
batches behind a type-CONFIRM modal and lists batch history. Users resolves
10-digit numbers locally first, then shows profile + wallet drawer with
freeze/unfreeze (mandatory reason, audited). Transactions is the platform-wide
filterable ledger with row inspection. Every privileged action lands in
`audit_logs`.

## Key decisions (the why)

- **UUID primary keys, 10-digit account numbers as addresses.** Wallets keep UUIDv7 PKs; the familiar NUBAN-style number is a separate unique column. Identities never change; addresses can.
- **Check-digit account numbers.** 9 random digits + weighted mod-10 check digit (shared util, used by API and both frontends). Typos die on-device before any network call.
- **Money in kobo, always.** Requests take naira integers (₦100–₦10,000,000); storage and math are integer kobo. Fees are explicitly zero.
- **Same-origin auth bridge.** Session cookies are set through Next.js `/api/auth/*` route handlers so they're first-party — cross-site `Set-Cookie` gets eaten by browsers and silently breaks login. Bearer tokens stay in memory; nothing else is proxied.
- **Freeze is enforced, not flagged.** Frozen wallets are rejected at transfer time (service + row-lock recheck), fund init, and webhook credit — plus excluded from recipient resolve.
- **Transfers are UUID-on-the-wire.** The UI resolves human input (account number → name) first; `POST /transfers` only ever sees IDs.
- **Admin lives under `/admin/*`.** Every admin route is `RolesGuard @Roles('ADMIN')`; the public name-only resolve was never widened. Privileged actions require a written reason and land in `audit_logs`.
- **Dashboards never page history for totals.** Monthly summary and platform metrics endpoints exist so cards don't download ledgers to add two numbers.
- **Session restore on reload.** The consumer layout re-fetches the profile on boot (refresh runs transparently); screens show a skeleton until then — never a half-personalized page.

## Testing

- Unit (vitest): env validation, check-digit math, admin freeze rules — `test:e2e` needs Docker up.
- E2E (`test/*.e2e-spec.ts`, Fastify + lightMyRequest, self-cleaning in FK-safe order): transfers incl. double-entry balance proof, freeze cycle + audit, settlement run, summary math, boot/health.
- New behavior lands with tests; the suite caught real bugs (see below).

## Deployment

- **API:** Render blueprint (`render.yaml`, Docker). Needs `DATABASE_URL` (Neon pooled, `?sslmode=require`), fresh RS256 `JWT_*_KEY` (real newlines — boot validation rejects mangled PEMs), live/test `PAYSTACK_SECRET`, Upstash REST pair, `CORS_ORIGINS`, `PAYSTACK_CALLBACK_URL`.
- **Frontends:** two Vercel projects rooted at `apps/web` and `apps/admin`, each with `NEXT_PUBLIC_API_URL` set (bake-time var — redeploy after changing).
- **Paystack:** webhook URL is `https://<api>/payments/webhook` (HMAC-SHA512 against `PAYSTACK_SECRET` — Paystack has no separate webhook secret); funding returns via `callback_url` to `/fund?reference=`.

## Bugs & fixes log

1. **AuditLog column type** — TS union inferred as `Object`, crashed TypeORM at boot. Unit tests blind; e2e caught it. Fix: explicit `varchar`.
2. **Scaffold e2e on Express** — targeted uninstalled `@nestjs/platform-express`. Migrated onto the Fastify test helper.
3. **E2E cleanup FK violation** — `settlements.triggeredBy` is NO ACTION. Fix: ordered teardown (transactions → settlements → audit → users).
4. **Stale test assumption** — unknown-number test used `1234567895`, owned by the seed account. Fix: mint a fresh valid number per run.
5. **Ghost greeting** — no session restore; every reload degraded to "hello, there". Fix: boot-time restore + skeleton gate.
6. **Dev-server mirage** — 5–16s loads were per-route compilation. Rule: judge speed on production builds only.
7. **Middleware 500** — `middleware.ts` belonged in `src/`, not web root.
8. **Mangled JWT PEMs on Render** — literal `\n` pasted instead of newlines; registration 500'd after persisting users (409 on retry). Fix: boot-time PEM validation (fail loud, never poison accounts) + orphan compensation on post-commit mint failure.
9. **Vestigial `PAYSTACK_WEBHOOK_SECRET`** — required at boot, never read; verifier uses `PAYSTACK_SECRET`. Removed everywhere.
10. **Cross-site session cookies** — browsers dropped Render's `Set-Cookie` on Vercel origins; login 200'd then bounced to login with no error. Fix: same-origin `/api/auth` bridge in both apps (allowlisted, status-gated cookie bridging, problem-shaped 502s).
11. **Missing Paystack return** — no `callback_url` sent, users stranded post-payment. Fix: env-driven callback + fund-page confirmation card.
12. **Turbo cache miss** — `outputs` only knew `dist/**`; added `.next/**`.
