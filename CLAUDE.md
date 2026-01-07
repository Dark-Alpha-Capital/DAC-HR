# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HR Automation system for Dark Alpha Capital - a full-stack application for managing candidates, positions, interviews, employees, and documents.

## Tech Stack

- **Runtime**: Bun (v1.3.1) - use `bun` instead of npm/pnpm/node
- **Monorepo**: Turborepo with workspaces in `apps/` and `packages/`
- **Frontend**: Next.js 16 with React 19, Tailwind CSS v4, shadcn/ui components
- **Backend**: Hono API server running on Bun
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: better-auth with Google OAuth and email/password
- **Storage**: Google Cloud Storage for documents
- **AI**: Google Gemini for candidate screening

## Commands

```bash
# Install dependencies
bun install

# Development (runs all apps)
bun run dev

# Build all apps
bun run build

# Lint
bun run lint

# Database operations (from packages/db)
bun --cwd packages/db run db:generate    # Generate migrations
bun --cwd packages/db run db:migrate     # Run migrations
bun --cwd packages/db run db:studio      # Open Drizzle Studio
bun --cwd packages/db run db:push        # Push schema changes
bun --cwd packages/db run db:seed        # Seed database

# Run individual apps
bun --cwd apps/web run dev               # Web app on :3000
bun --cwd apps/backend run dev           # Backend API on :8080

# Type checking (web app)
bun --cwd apps/web run typecheck
```

## Architecture

### Monorepo Structure

```
apps/
├── web/           # Next.js frontend (main HR dashboard)
└── backend/       # Hono API server (candidate routes, document management)

packages/
├── db/            # Drizzle schema, queries, migrations
├── ui/            # Shared shadcn/ui components (@workspace/ui)
├── eslint-config/ # Shared ESLint config
└── typescript-config/
```

### Data Flow

1. **Server Actions** (`apps/web/lib/actions/`): CRUD operations for all entities use Next.js server actions with Zod validation and audit logging
2. **Database Queries** (`packages/db/queries.ts`): Reusable query functions imported via `@workspace/db/queries`
3. **Schema** (`packages/db/schema.ts`): Drizzle schema with all tables and types exported via `@workspace/db/schema`

### Key Entities (schema.ts)

- `position` - Job positions with department, hire level, status
- `candidate` - Applicant information
- `application` - Links candidates to positions with status tracking
- `interview` - Interview instances with feedback, linked to round templates
- `employee` - Hired employees
- `documents` / `candidateDocument` - File storage references
- `candidateAiScreening` - AI-generated candidate analysis

### Auth Pattern

Both web and backend use `better-auth` with shared configuration:
- Admin roles determined by email whitelist in `auth.ts`
- Web uses `nextCookies()` plugin, backend adds `bearer()` plugin
- Session validation: `auth.api.getSession({ headers: await headers() })`

### UI Components

Import from `@workspace/ui/components/{component}`:
```tsx
import { Button } from "@workspace/ui/components/button"
```

### Backend Routes

Hono routes in `apps/backend/routes/`:
- `/candidate` - Candidate CRUD, bulk operations, AI screening
- `/post` - Document posting endpoints
- Type exports via `AppType` for client usage

## Environment Variables

### For Local Development

Required in `apps/web/.env`:
- `DATABASE_URL` - PostgreSQL connection
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - OAuth
- `BETTER_AUTH_SECRET` - Auth encryption
- `BETTER_AUTH_URL` - Auth base URL (e.g., http://localhost:3000)
- `NEXT_PUBLIC_BETTER_AUTH_BASEURL` - Public auth URL (same as BETTER_AUTH_URL)
- `GEMINI_API_KEY` - AI screening

Required in `apps/backend/.env`:
- `DATABASE_URL`
- `GCLOUD_PROJECT_ID`, `GCS_CLIENT_EMAIL`, `GCS_PRIVATE_KEY`, `GCLOUD_BUCKET` - Cloud Storage

### For Docker Build

For Docker builds, create a `.env` file in the project root with all the above variables. This prevents warnings during `docker-compose build`.

The `docker-compose.yml` file uses `${VAR:-}` syntax to provide default empty values, but you should still create a `.env` file with actual values for the build to work correctly at runtime.

## Local Development

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Run migrations
bun --cwd packages/db run db:migrate

# Start development servers
bun run dev
```

Database is exposed on port 5433 (not default 5432).

## Docker Deployment

```bash
# Build and start the Docker container
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

**Note**: Before building, ensure you have a `.env` file in the project root with all required environment variables. This prevents warnings during the Docker build process.

The application will be available at `http://localhost:3001` (mapped from container port 3000).
