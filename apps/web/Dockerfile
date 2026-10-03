# Consumer web app — DEVELOPMENT image for docker compose local runs.
# (Production web deploys to Vercel per TRD; see Phase 9 notes.)
FROM node:22-alpine
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY apps/web/package.json apps/web/
COPY packages/config/package.json packages/config/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/config packages/config
COPY packages/shared-types packages/shared-types
COPY apps/web apps/web
RUN pnpm install --frozen-lockfile \
  --fetch-retries=5 \
  --fetch-retry-maxtimeout=180000 \
  --fetch-timeout=180000 \
  --network-concurrency=4
EXPOSE 3001
CMD ["pnpm", "--filter", "@zeedle/web", "dev"]
