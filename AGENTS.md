# AGENTS.md — HR Automation Platform (TanStack Start + Cloudflare)

## Quick reference

```bash
bun install          # always use bun, never npm/pnpm/yarn
bun run dev          # turbo dev (Vite on :3000)
bun run build        # turbo build (vite build)
bun run lint         # turbo lint (ESLint 9 flat config)
bun run test         # turbo run test (bun test in each package)
bun run format       # prettier across *.ts,*.tsx,*.md
```

**Typecheck web app directly:** `tsc --noEmit` from `apps/web/`
**Deploy web:** `wrangler deploy` from `apps/web/`

## Architecture overview

Turborepo monorepo with `bun@1.1.38`. Deployed on **Cloudflare Workers**.

| Directory                     | Package                        | Role                                                                  |
| ----------------------------- | ------------------------------ | --------------------------------------------------------------------- |
| `apps/web/`                   | `web`                          | TanStack Start app (React 19, Vite, Tailwind v4, shadcn/ui)           |
| `apps/worker/`                | `worker`                       | Stub (future Cloudflare Worker for background jobs)                   |
| `packages/db/`                | `@workspace/db`                | Drizzle ORM + PostgreSQL via `@neondatabase/serverless` (HTTP driver) |
| `packages/nextcloud/`         | `@workspace/nextcloud`         | Nextcloud WebDAV client                                               |
| `packages/file-search/`       | `@workspace/file-search`       | Google Gemini File Search API                                         |
| `packages/ui/`                | `@workspace/ui`                | shadcn/ui component library                                           |
| `packages/eslint-config/`     | `@workspace/eslint-config`     | Shared ESLint configs (base, next-js, react-internal)                 |
| `packages/typescript-config/` | `@workspace/typescript-config` | Shared tsconfig extends                                               |

## Database (Drizzle + Neon HTTP)

- Driver: `@neondatabase/serverless` (HTTP-based, Cloudflare Workers compatible)
- Production: Hyperdrive pools connections to Neon Postgres
- Schema: `packages/db/schema.ts` (22+ tables)
- Migrations: `packages/db/drizzle/` (25 SQL migration files)
- The DB client uses a **lazy-init Proxy pattern**. Import `db` directly.

```bash
cd packages/db
bun run db:generate   # generate migrations from schema changes
bun run db:migrate    # apply migrations
bun run db:push       # push schema directly
bun run db:seed       # seed sample data
```

All common Drizzle operators re-exported:

```ts
import { db, eq, and, or, sql, asc, desc, inArray, count } from "@workspace/db";
```

## Environment variables

- All env vars go in `apps/web/.env` (not the repo root)
- Template: `apps/web/.env.example`
- `packages/db/.env` only needs `DATABASE_URL` (for drizzle-kit CLI)
- Bun auto-loads `.env` files; `auth.ts` explicitly calls `dotenv/config`
- Dev secrets for wrangler: `apps/web/.dev.vars`

## Auth (better-auth)

- Config: `apps/web/auth.ts`, Client: `apps/web/auth-client.ts`
- Only `@darkalphacapital.com` emails can sign in
- Admin emails hardcoded in `auth.ts` (rahul@, gaurav@, da@)
- Auth check uses `authGuard` middleware, not per-route `requireAuth()`
- `authGuard` puts typed `{ session }` in request context

## Observability

- `apps/web/lib/middleware/request-logger.ts` — centralized request timing middleware
- `apps/web/lib/middleware/auth-guard.ts` — `authGuard` + `adminGuard` middleware
- Structured JSON logging throughout (readable via `wrangler tail`)

## API route conventions

- Zod validation with `safeParse`, return 400 with `flatten().fieldErrors`
- Audit logs inserted inline with `.catch()` (fire-and-forget)
- Auth check via middleware, not inline in handlers

## Config files

- `apps/web/vite.config.ts` — Vite + TanStack Start + Tailwind v4 plugin
- `apps/web/wrangler.jsonc` — Cloudflare Workers config (R2, Hyperdrive bindings)

## File storage

- Documents stored in Cloudflare R2 (bucket: `hr-documents`)
- Binding: `env.DOCUMENTS_BUCKET` in Workers runtime

## Testing

All tests use `bun test` with `--pass-with-no-tests`:

```bash
bun test --pass-with-no-tests    # single package
bun run test                     # all packages via turbo
```

Import from `bun:test`: `import { test, expect } from "bun:test";`
