# AGENTS.md — HR Automation Platform (TanStack Start + Cloudflare)

## Quick reference

```bash
bun install          # always use bun, never npm/pnpm/yarn
bun run dev          # turbo dev (Vite on :3000)
bun run build        # turbo build (vite build)
bun run lint         # turbo lint (ESLint 9 flat config)
bun run test         # turbo run test (bun test in each package)
bun run format       # prettier --write "**/*.{ts,tsx,md}" (no config file — uses defaults)
```

**Typecheck:** `tsc --noEmit` from `apps/web/` (no root-level typecheck script)
**Deploy:** `wrangler deploy` from `apps/web/`

## Architecture overview

Turborepo monorepo with `bun@1.1.38`. Deployed on **Cloudflare Workers**.

| Directory                     | Package                        | Role                                                                  |
| ----------------------------- | ------------------------------ | --------------------------------------------------------------------- |
| `apps/web/`                   | `web`                          | TanStack Start app (React 19, Vite 8, Tailwind v4, shadcn/ui)         |
| `apps/worker/`                | `worker`                       | Stub (future Cloudflare Worker for background jobs)                   |
| `packages/db/`                | `@workspace/db`                | Drizzle ORM + Cloudflare D1 (SQLite) via `drizzle-orm/d1`             |
| `packages/nextcloud/`         | `@workspace/nextcloud`         | Nextcloud WebDAV client                                               |
| `packages/file-search/`       | `@workspace/file-search`       | Google Gemini File Search API                                         |
| `packages/ui/`                | `@workspace/ui`                | shadcn/ui component library                                           |
| `packages/eslint-config/`     | `@workspace/eslint-config`     | Shared ESLint configs (base, next-js, react-internal)                 |
| `packages/typescript-config/` | `@workspace/typescript-config` | Shared tsconfig extends                                               |
| `packages/mail/`              | —                              | Empty stub (no package.json)                                          |

## TanStack Start routing quirks

- **Routes live directly under `app/`** (e.g. `app/_main/dashboard.tsx`), NOT under `app/routes/`. This is because `vite.config.ts` sets `routesDirectory: "."`.
- `app/routeTree.gen.ts` is **auto-generated** — never edit it manually.
- `_main` is a layout route wrapping all authenticated pages. It calls `fetchSession()` in `beforeLoad`.
- Public routes: `login.tsx`, `signup.tsx`, `unauthorized.tsx`, `interview/$token/index.tsx`.

## Database (Drizzle + Cloudflare D1)

- Driver: `drizzle-orm/d1` via `env.DB` binding (`cloudflare:workers`)
- D1 database: `hr-automation-db` (binding `DB` in `apps/web/wrangler.jsonc`)
- Schema: `packages/db/schema.ts` (27 tables, SQLite dialect)
- Migrations: `packages/db/drizzle/` — applied with `wrangler d1 migrations apply`
- Repositories: `packages/db/repositories/` (5 files: audit, candidate, document, interview, interview-session)
- The DB client uses a **lazy-init Proxy pattern**. Import `db` directly — it reads the D1 binding on first access.

```bash
cd packages/db
bun run db:generate      # generate migrations from schema changes
bun run db:migrate       # apply migrations to local D1
bun run db:migrate:remote # apply migrations to remote D1
bun run db:seed          # seed local D1 (bun:sqlite against wrangler local state)
```

All common Drizzle operators re-exported from `@workspace/db`:

```ts
import { eq, and, or, sql, asc, desc, inArray, count, gte, lte } from "@workspace/db";
import { db } from "@workspace/db/db"; // server-only — D1 binding via cloudflare:workers
// also exports InferSelectModel, InferInsertModel
```

## Environment variables

- All env vars go in `apps/web/.env` (not the repo root)
- Template: `apps/web/.env.example`
- No `DATABASE_URL` — D1 is bound via `wrangler.jsonc`
- `apps/web/.dev.vars` duplicates secrets for **wrangler dev** (Cloudflare Workers runtime can't read `.env`)
- `auth.ts` explicitly calls `dotenv/config` to load `.env` at startup (`bun` auto-loads `.env` only for scripts)

## Auth (better-auth)

- Config: `apps/web/auth.ts`, Client: `apps/web/auth-client.ts`
- Only `@darkalphacapital.com` emails can sign in
- Admin emails hardcoded in `auth.ts` (rahul@, gaurav@, da@)
- Session helpers in `lib/auth-session.ts`:
  - `fetchSession()` — used in `beforeLoad` of layout routes
  - `getSession()` from `lib/middleware/auth-guard.ts` — used inline in API routes
  - `authGuard` / `adminGuard` middleware exist in `lib/middleware/auth-guard.ts` but are **not currently used**
  - `requestLogger` middleware exists in `lib/middleware/request-logger.ts` but is **not currently used**

## API route conventions

- Zod validation with `safeParse`, return 400 with `flatten().fieldErrors`
- Auth check via `getSession()` called inline at the top of each handler
- Audit logs inserted inline with `.catch()` (fire-and-forget)
- Structured JSON logging via `console.info(JSON.stringify({...}))` (readable via `wrangler tail`)

## File storage

- Documents stored in **Nextcloud** via WebDAV (`packages/nextcloud/`)
- Upload/view API routes: `app/api/documents/upload.tsx`, `app/api/documents/view.tsx`
- Requires `NEXTCLOUD_URL`, `NEXTCLOUD_USER`, `NEXTCLOUD_PASSWORD` in `apps/web/.env`

## Cloudflare bindings

- D1 binding `DB` → database `hr-automation-db`
- Vectorize binding `VECTORIZE` → index `hr-documents-index` (reserved for future RAG)
- `cloudflare()` vite plugin handles the Workers integration

## Testing

All tests use `bun test` with `--pass-with-no-tests`:

```bash
bun test --pass-with-no-tests    # single package
bun run test                     # all packages via turbo
```

Import from `bun:test`: `import { test, expect } from "bun:test";`
