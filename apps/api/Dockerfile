# ---------- Stage 1: install all workspace dependencies (incl. dev, needed to build)
FROM node:22-alpine AS deps
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY apps/api/package.json apps/api/
COPY packages/config/package.json packages/config/
COPY packages/shared-types/package.json packages/shared-types/
# Fetch hardening: registries and CI networks are not always fast.
# Lower concurrency survives socket resets; generous retries ride them out.
RUN pnpm install --frozen-lockfile \
  --fetch-retries=5 \
  --fetch-retry-maxtimeout=180000 \
  --fetch-timeout=180000 \
  --network-concurrency=4

# ---------- Stage 2: compile shared-types, then the API
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
# pnpm isolates node_modules per workspace package — copy all of them,
# not just the root, or per-package binaries (tsc, nest) won't resolve.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps ./apps
COPY --from=deps /app/packages ./packages
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/api apps/api
COPY packages/config packages/config
COPY packages/shared-types packages/shared-types
RUN pnpm --filter @zeedle/shared-types build \
 && pnpm --filter @zeedle/api build

# ---------- Stage 3: production runtime (prod deps + compiled output only)
FROM node:22-alpine AS production
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/config/package.json packages/config/
COPY packages/shared-types/package.json packages/shared-types/
RUN corepack enable \
 && pnpm install --frozen-lockfile --prod --ignore-scripts \
  --fetch-retries=5 \
  --fetch-retry-maxtimeout=180000 \
  --fetch-timeout=180000 \
  --network-concurrency=4 \
 && pnpm rebuild bcrypt \
 && rm -rf /root/.local/share/pnpm /root/.cache
COPY --from=build --chown=app:app /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=app:app /app/packages/shared-types/dist ./packages/shared-types/dist
USER app
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
