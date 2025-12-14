# Use Bun official image (matching packageManager version)
FROM oven/bun:1.2.22 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
# Copy root package files for workspace setup
COPY package.json bun.lock* ./
# Copy backend package.json
COPY apps/backend/package.json ./apps/backend/
# Copy workspace package.json files (required for workspace dependencies)
COPY packages/db/package.json ./packages/db/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/
# Install all dependencies
RUN bun install

# Production stage
FROM base AS production
WORKDIR /app

# Copy dependencies (Bun workspaces install to root node_modules)
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY package.json bun.lock* ./
COPY apps/backend ./apps/backend
COPY packages/db ./packages/db



# Set working directory to backend
WORKDIR /app/apps/backend

# Expose port (Cloud Run will set PORT env var automatically)
EXPOSE 8080

# Set default port if not provided
ENV PORT=8080

# Run the server
CMD ["bun", "run", "index.ts"]
