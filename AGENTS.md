# AGENTS.md — HR Automation Platform (TanStack Start + Cloudflare)

## Quick reference

```bash
bun install          # always use bun, never npm/pnpm/yarn
bun run dev          # turbo dev (Vite on :3000, runs apps/frontend)
bun run build        # turbo build
bun run lint         # turbo lint (ESLint 9 flat config)
bun run test         # turbo run test (bun test in each package)
bun run format       # prettier --write "**/*.{ts,tsx,md}" (no config file)
```

**Typecheck:** `tsc --noEmit` from `apps/frontend/` (no root-level typecheck script)
**Deploy:** `bun run deploy` from `apps/frontend/` (runs `vite build && wrangler deploy`)

## Architecture overview

Turborepo monorepo with `bun@1.1.38`. Deployed on **Cloudflare Workers**.

| Directory                     | Package                        | Role                                                                  |
| ----------------------------- | ------------------------------ | --------------------------------------------------------------------- |
| `apps/frontend/`              | `hr-automation`                | TanStack Start app (React 19, Vite 8, Tailwind v4, shadcn/ui)         |
| `apps/agents/`                | `agents`                       | Standalone Bun app (no framework)                                      |
| `packages/db/`                | `@workspace/db`                | Drizzle ORM + Cloudflare D1 (SQLite) via `drizzle-orm/d1`             |
| `packages/nextcloud/`         | `@workspace/nextcloud`         | Nextcloud WebDAV client                                               |
| `packages/ai-config/`         | `@workspace/ai-config`         | OpenAI / AI SDK provider and embeddings                               |
| `packages/interview-realtime/`| `@workspace/interview-realtime`| Shared types, events, and prompts for interview sessions               |
| `packages/eslint-config/`     | `@workspace/eslint-config`     | Shared ESLint configs (base, next-js, react-internal)                 |
| `packages/typescript-config/` | `@workspace/typescript-config` | Shared tsconfig extends                                               |
| `packages/mail/`              | —                              | Empty stub (no package.json)                                          |

Shadcn/ui components live in `apps/frontend/src/components/ui/` (no separate `packages/ui/`).

**Path aliases:** `@/*` and `~/*` both resolve to `apps/frontend/src/*` (configured in `tsconfig.json`, picked up by Vite via `tsconfigPaths`).

## TanStack Start routing

- Routes live under `apps/frontend/src/routes/` (e.g. `src/routes/_main/dashboard.tsx`).
- `src/routes/routeTree.gen.ts` is **auto-generated** — never edit it manually.
- `src/routes/__root.tsx` is the root route (wraps every page in `<Outlet />`).
- `src/routes/_main/route.tsx` is the authenticated layout route. It calls `fetchSession()` in `beforeLoad` and redirects to `/login` if no session.
- `src/router.tsx` exports `getRouter()` which creates a `createRouter` from `routeTree`.
- Public routes: `login.tsx`, `signup.tsx`, `unauthorized.tsx`, `interview/$token/index.tsx`.
- `vite.config.ts` uses `tanstackStart({ srcDirectory: "src" })` — no custom `routesDirectory`.

## Database (Drizzle + Cloudflare D1)

- Driver: `drizzle-orm/d1` via `cloudflare:workers` environment binding.
- D1 database: `hr-automation-db` (binding `DB` in `apps/frontend/wrangler.jsonc`).
- Schema: `packages/db/schema.ts` (SQLite dialect, ~30 tables).
- Migrations: `packages/db/drizzle/` — applied with `wrangler d1 migrations apply`.
- Repositories: `packages/db/repositories/` (5 files: audit, candidate, document, interview, interview-session).

```bash
cd packages/db
bun run db:generate      # generate migrations from schema changes
bun run db:migrate       # apply migrations to local D1
bun run db:migrate:remote # apply migrations to remote D1
bun run db:seed          # seed local D1
bun run db:seed:remote   # seed remote D1
```

### DB import — critical: server-only with client stub

`packages/db/db.ts` imports `env` from `cloudflare:workers` directly. This will crash on the client. To protect against this, `vite.config.ts` has a custom `environmentAlias()` plugin that **swaps `@workspace/db/db`** depending on the Vite environment:

- **Server (SSR)**: resolves to `packages/db/db.ts` (real D1 binding)
- **Client**: resolves to `packages/db/db.stub.ts` (throws on all access)

The same `environmentAlias()` plugin also stubs `cloudflare:workers` → `src/lib/cloudflare-workers-stub.ts` on the client.

When you import `db`, always use `@workspace/db/db` as the module specifier:

```ts
import { db } from "@workspace/db/db"; // server-only
```

The alias plumbing depends on exact import specifiers — do not rename or re-export this module without updating both `db.ts`, `db.stub.ts`, and `environmentAlias()` in `vite.config.ts`.

### Drizzle operators

All common Drizzle operators re-exported from `@workspace/db`:

```ts
import { eq, and, or, sql, asc, desc, inArray, count, gte, lte } from "@workspace/db";
// also exports InferSelectModel, InferInsertModel
```

## Environment variables

- All env vars go in `apps/frontend/.env` (not the repo root).
- Template: `apps/frontend/.env.example`.
- No `DATABASE_URL` — D1 is bound via `wrangler.jsonc`.
- `apps/frontend/.dev.vars` duplicates secrets for **wrangler dev** (Cloudflare Workers runtime can't read `.env`).
- **Local dev uses remote D1/Vectorize bindings** (`remote: true` in `wrangler.jsonc`). Run `bunx wrangler login` once before `bun run dev`.

## Auth (better-auth)

- Config: `apps/frontend/src/auth.ts`, Client: `apps/frontend/src/auth-client.ts`.
- Only `@darkalphacapital.com` emails can sign in.
- Admin emails hardcoded in `src/auth.ts` (`rahul@`, `gaurav@`, `da@`).
- Session helpers:
  - `fetchSession()` in `lib/auth-session.ts` — server function used in `beforeLoad` of layout routes.
  - `getSession()` in `lib/server/session.server.ts` — used inline in API routes and middleware.
  - `authGuard` / `adminGuard` in `lib/middleware/auth-guard.ts` — route-level middleware for server routes.
  - `serverFnAuthGuard` / `serverFnAdminGuard` in `lib/middleware/auth-guard.ts` — function middleware for server functions.
  - `apiAuthGuard` in `lib/middleware/api-auth-guard.ts` — middleware for API route handlers.

## API route conventions

- API routes live under `apps/frontend/src/routes/api/`.
- Zod validation with `safeParse`, return 400 with `flatten().fieldErrors`.
- Auth check via `getSession()` called inline at the top of each handler.
- Audit logs inserted inline with `.catch()` (fire-and-forget).
- Structured JSON logging via `console.info(JSON.stringify({...}))`.

## File storage

- Documents stored in **Nextcloud** via WebDAV (`packages/nextcloud/`).
- Upload/view API routes: `routes/api/documents/`.
- Requires `NEXTCLOUD_URL`, `NEXTCLOUD_USER`, `NEXTCLOUD_PASSWORD` in `apps/frontend/.env`.

## Cloudflare bindings

- D1 binding `DB` → database `hr-automation-db`.
- Vectorize binding `VECTORIZE` → index `hr-documents-index` (reserved for RAG).
- Workflow binding `DOCUMENT_INDEXING_WORKFLOW` → `DocumentIndexingWorkflow` (`src/workflows/document-indexing.ts`).
- Workflow binding `INTERVIEW_EVALUATION_WORKFLOW` → `InterviewEvaluationWorkflow` (`src/workflows/interview-evaluation.ts`).
- Durable Object binding `INTERVIEW_SESSION_DO` → `InterviewSessionDO` (`src/durable-objects/interview-session-do.ts`) — ~850 lines, realtime WebSocket interview sessions with anti-cheat.
- `@cloudflare/vite-plugin` handles Workers integration (configured in `vite.config.ts`).

## Testing

All tests use `bun test` with `--pass-with-no-tests`:

```bash
bun test --pass-with-no-tests    # single package
bun run test                     # all packages via turbo
```

Import from `bun:test`: `import { test, expect } from "bun:test";`

Tests are sparse — currently only one test file at `apps/frontend/src/lib/__tests__/format-date.test.ts`.
