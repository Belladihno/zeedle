# Zeedle Admin Frontend — Requirements & Build Spec

Internal operations console for Zeedle staff. Read-only oversight plus the
settlement trigger. This is a separate Next.js app (`apps/admin`, port 3002),
not a route inside the consumer app — different users, different device
(desktop), different auth role.

## 1. Tech & conventions (mirror the consumer app)

- Next.js 15 (App Router) + TypeScript strict + Tailwind + TanStack Query.
- HTTP via `ky` with the same envelope handling: `{ success, data, meta }`
  success shape, RFC7807 problem-details errors, `credentials: 'include'`
  (HttpOnly `refreshToken` cookie), `x-request-id` per request, 401 → silent
  refresh → retry → else redirect to `/login`.
- Auth state in a tiny Zustand store (memory token only, never localStorage).
- Shared contracts from `@zeedle/shared-types` (`transpilePackages` in
  `next.config.ts`, same as consumer).
- Same icon system (Material Symbols Outlined) and Obsidian Kinetic tokens
  (colors, fonts) so it reads as the same product — but a **desktop-dense
  layout** (multi-column tables, sidebar nav), not the 480px consumer column.
- Env: `NEXT_PUBLIC_API_URL=http://localhost:3000`, `.env.example` committed,
  `.env.local` git-ignored.

## 2. Auth & role gating

- Login reuses `POST /auth/login` (email + password). No public registration
  surface — admins are created via seed/scripts with `role: 'ADMIN'`.
- After login, call `GET /users/me` and check `role === 'ADMIN'`. Non-admin
  authenticated users get a hard "Not authorized" screen (never redirect them
  into consumer pages from here).
- Every admin API route is additionally guarded server-side by
  `JwtAuthGuard + RolesGuard @Roles('ADMIN')` → 403 for USER tokens. The UI
  must render 403s as "session lacks admin rights," not a generic error.
- Middleware protects `/overview`, `/settlements`, `/users`, `/transactions`;
  same cookie-presence pattern as the consumer app.
- PIN is not used in the admin app. No transaction PIN screens.

## 3. Screens

### 3.1 `/login`
- Email + password, single card centered. Errors from problem-details
  `detail`. Rate-limit (auth tier: 5/min) → show `Retry-After` countdown.
- On success: fetch profile, verify ADMIN, route to `/overview`.

### 3.2 `/overview` (default landing)
Platform-at-a-glance cards, each backed by a cheap endpoint (no history
paging for totals — same lesson as the consumer dashboard):
- Total settled volume + count (latest settlement, or sum over history page 1).
- Pending/unsettled transaction count in the current open window.
- Total users / wallets (needs API gap §5.1).
- Active alerts: failed webhooks? locked PINs spike? (needs API gap §5.3;
  v1 may show "no alert source wired" empty state honestly.)

### 3.3 `/settlements`
- Table of `GET /settlements` history: period, totalAmount (kobo → ₦),
  transactionCount, status, triggeredBy, createdAt. Paginated (page/limit).
- "Run settlement" panel: `periodStart` + `periodEnd` datetime inputs →
  `POST /settlements/run` → returns the completed batch summary; show it and
  prepend to the table. Confirm dialog before submit (this finalizes money
  movement records).
- Empty-range error (`400 No unsettled transactions in range`) renders as a
  plain notice, not a crash.

### 3.4 `/users` (support lookup)
- Search by 10-digit Zeedle account number → resolve to profile
  (needs API gap §5.2: an admin resolve that may return contact data —
  the public resolve is name-only by design and stays that way).
- Result view: profile fields, wallet balance + status, active/inactive,
  deleted flag. Actions: deactivate/reactivate wallet (needs API gap §5.2).
- Never expose password hashes or PIN data — the API must not return them.

### 3.5 `/transactions` (oversight)
- Platform-wide filterable table (type/status/source/date range). This needs
  API gap §5.1 — the current history endpoint is per-wallet only.
- Row click → detail drawer reusing the consumer receipt layout
  (reference, amounts, parties, settlement linkage).

## 4. Core flows

### F1 — Admin sign-in
1. `/login` → credentials → token pair (memory + HttpOnly cookie).
2. `GET /users/me` → assert `role === 'ADMIN'` → `/overview`.
3. Non-admin → "Not authorized" screen + sign out.

### F2 — Run settlement
1. `/settlements` → enter period → confirm dialog.
2. `POST /settlements/run` → `201` summary → toast + table prepend.
3. `400` empty range → inline notice. `429` → retry countdown.

### F3 — Support lookup
1. `/users` → enter 10-digit number → local check-digit validation first
   (reuse `isValidAccountNumber` from shared-types — no network on typos).
2. Admin resolve → profile + wallet card.
3. Deactivate/reactivate with confirm dialog + reason note (audit).

## 5. API gaps (backend work required before/during admin build)

1. **Platform metrics** — no endpoint for user/wallet counts or unsettled
   counts. Add `GET /admin/metrics` (ADMIN-only).
2. **Admin user/wallet management** — no user list, no admin resolve with
   contact data, no deactivate endpoint. Add `GET /admin/users`,
   `GET /admin/users/resolve?accountNumber=`, `PATCH /admin/users/:id`
   (all ADMIN-only; never widen the public resolve).
3. **Platform transaction view** — history is per-wallet. Add
   `GET /admin/transactions` with the same filter DTO (ADMIN-only).
4. **Audit trail** — admin actions (settlement runs, deactivations) should
   record actor + reason. No table exists yet; minimal `audit_logs` entity.

## 6. Non-goals (v1)
- No fund initiation, no transfers, no PIN management from admin.
- No real-time websockets — poll summaries at 60s staleTime like consumer.
- No theming work beyond reusing consumer tokens + desktop density.

## 7. Suggested build order
1. Scaffold (`apps/admin`, providers/ky/store/middleware/login) + role gate.
2. Settlements screen (only fully-supported screen with existing APIs).
3. Backend gaps in §5 (metrics → users → transactions → audit).
4. Overview, Users, Transactions screens against the new endpoints.
5. Polish: empty states, 403/429 handling, e2e for F1–F3.
