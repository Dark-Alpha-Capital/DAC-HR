# syntax=docker.io/docker/dockerfile:1

FROM node:20-slim AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/web/package.json ./apps/web/
COPY packages/ ./packages/
# Try npm ci first (faster, more deterministic), fall back to npm install if lock file is out of sync
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# Build the application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
ENV NEXT_TELEMETRY_DISABLED=1

# Set Turbopack root to monorepo root for proper workspace resolution
ENV TURBOPACK_ROOT=/app

# Build-time arguments for NEXT_PUBLIC_ variables
ARG NEXT_PUBLIC_BETTER_AUTH_BASEURL
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

# Convert ARGs to ENVs so the build process can access them
ENV NEXT_PUBLIC_BETTER_AUTH_BASEURL=${NEXT_PUBLIC_BETTER_AUTH_BASEURL}
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}

# Build the Next.js app
WORKDIR /app
RUN npx turbo run build --filter=web

# Production image, copy all the files and run next
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 nextjs

# Copy the built application
# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
# In monorepo, standalone output preserves directory structure: apps/web/
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
# Static files must be at apps/web/.next/static relative to where server.js runs
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# server.js is created by next build from the standalone output
# Check common locations for server.js in monorepo standalone output
CMD ["sh", "-c", "if [ -f ./apps/web/server.js ]; then node ./apps/web/server.js; elif [ -f ./server.js ]; then node ./server.js; else echo 'Error: server.js not found' && ls -la && exit 1; fi"]
