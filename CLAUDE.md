# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HR Automation system for Dark Alpha Capital - a full-stack application for managing candidates, positions, interviews, employees, and documents.

## Tech Stack

- **Runtime**: Bun - use `bun` instead of npm/pnpm/node
- **Monorepo**: Turborepo with workspaces in `apps/` and `packages/`
- **Frontend**: Next.js 16 with React 19, Tailwind CSS v4, shadcn/ui components
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

# Run web app individually
bun --cwd apps/web run dev               # Web app on :3000

# Type checking (web app)
bun --cwd apps/web run typecheck
```

## Architecture

### Monorepo Structure

```
apps/
└── web/           # Next.js frontend (main HR dashboard)

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
- `auditLog` - Tracks all entity changes with user info

### Auth Pattern

Uses `better-auth` with shared configuration in `apps/web/auth.ts`:

- Admin roles determined by email whitelist
- Uses `nextCookies()` plugin for cookie-based auth
- Session validation: `auth.api.getSession({ headers: await headers() })`

### UI Components

Import from `@workspace/ui/components/{component}`:

```tsx
import { Button } from "@workspace/ui/components/button";
```

### Server Action Pattern

Server actions in `apps/web/lib/actions/` follow this pattern:

1. Validate session with `auth.api.getSession()`
2. Parse input with Zod schemas from `lib/schemas/`
3. Perform database operation
4. Call `revalidatePath()` / `updateTag()` for cache invalidation
5. Log action with `insertAuditLog()` using `after()` for non-blocking audit

## Environment Variables

Required in `apps/web/.env`:

- `DATABASE_URL` - PostgreSQL connection
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - OAuth
- `BETTER_AUTH_SECRET` - Auth encryption
- `BETTER_AUTH_URL` - Auth base URL (e.g., http://localhost:3000)
- `NEXT_PUBLIC_BETTER_AUTH_BASEURL` - Public auth URL
- `GEMINI_API_KEY` - AI screening
- `GCLOUD_PROJECT_ID`, `GCS_CLIENT_EMAIL`, `GCS_PRIVATE_KEY`, `GCLOUD_BUCKET` - Cloud Storage

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

The application will be available at `http://localhost:3001` (mapped from container port 3000).
