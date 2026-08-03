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

**Typecheck:** `tsc --noEmit` from `apps/frontend/` (no root-level typecheck script; `tsconfig.json` sets `noEmit: true`).
**Deploy:** `bun run deploy` from `apps/frontend/` = `db:migrate:remote && vite build && wrangler deploy --env production`. Migrations run before the deploy — don't skip that step.

## Architecture overview

Turborepo monorepo with `bun@1.1.38`. Deployed on **Cloudflare Workers**.

| Directory                     | Package                        | Role                                                                  |
| ----------------------------- | ------------------------------ | --------------------------------------------------------------------- |
| `apps/frontend/`              | `hr-automation`                | TanStack Start app (React 19, Vite 8, Tailwind v4, shadcn/ui)         |
| `apps/agents/`                | `agents`                       | Standalone Bun app (stub — still `console.log` in `index.ts`)         |
| `packages/db/`                | `@workspace/db`                | Drizzle ORM + Cloudflare D1 (SQLite) via `drizzle-orm/d1`             |
| `packages/candidate-import/`  | `@workspace/candidate-import`  | Candidate import pipeline (CSV/ZIP/Handshake PDF, dedup, matching)    |
| `packages/nextcloud/`         | `@workspace/nextcloud`         | Nextcloud WebDAV client                                               |
| `packages/ai-config/`         | `@workspace/ai-config`         | OpenAI / AI SDK provider, embeddings, realtime client                |
| `packages/interview-realtime/`| `@workspace/interview-realtime`| Shared types, events, prompts, answer evaluation for interview sessions |
| `packages/mail/`              | `mail`                         | Stub (has package.json, unused)                                       |
| `packages/eslint-config/`     | `@workspace/eslint-config`     | Shared ESLint configs (base, next-js, react-internal)                 |
| `packages/typescript-config/` | `@workspace/typescript-config` | Shared tsconfig extends                                               |

Shadcn/ui components live in `apps/frontend/src/components/ui/` (no separate `packages/ui/`).

**Path aliases:** `@/*` and `~/*` both resolve to `apps/frontend/src/*` (configured in `tsconfig.json`, picked up by Vite via `tsconfigPaths`).

## TanStack Start routing

- Routes live under `apps/frontend/src/routes/` (e.g. `src/routes/_main/dashboard.tsx`).
- `src/routes/routeTree.gen.ts` is **auto-generated** — never edit it manually.
- `src/routes/__root.tsx` is the root route (wraps every page in `<Outlet />`).
- `src/routes/_main/route.tsx` is the authenticated layout route. It calls `fetchSession()` in `beforeLoad` and redirects to `/login` if no session.
- Public/auth routes are grouped under `_auth/` (login, signup, unauthorized). `_auth/route.tsx` is a bare centered layout.
- Public interview route: `interview/$token/index.tsx` (voice interview client).
- API routes live under `routes/api/`. Better-auth handler is `routes/api/auth/$.tsx`; Google OAuth callback is `routes/api/login/google.tsx`.
- `vite.config.ts` uses `tanstackStart({ srcDirectory: "src" })` — no custom `routesDirectory`.

## Database (Drizzle + Cloudflare D1)

- Driver: `drizzle-orm/d1` via `cloudflare:workers` environment binding.
- D1 database: `hr-automation-db` (binding `DB` in `apps/frontend/wrangler.jsonc`).
- Schema: `packages/db/schema.ts` (SQLite dialect, ~36 tables).
- Migrations: `packages/db/drizzle/` (16 SQL files) — applied via `wrangler d1 migrations apply` / scripts below.
- Repositories: `packages/db/repositories/` (10 files: attendance, audit, candidate, candidate-import, document, holiday, interview, interview-bundle, interview-session, screener).

```bash
cd packages/db
bun run db:generate      # generate migrations from schema changes
bun run db:migrate       # apply migrations to local D1
bun run db:migrate:remote # apply migrations to remote D1
bun run db:seed          # seed local D1
bun run db:seed:remote   # seed remote D1
bun run db:studio        # drizzle studio — needs CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN in apps/frontend/.env
bun run db:seed-positions        # + :remote variant
bun run db:reset-rounds          # + :remote variant
bun run db:finalize-interview-schema  # + :remote variant
```

The package exports many submodules beyond `.`/`./db`: `./queries`, `./repositories/*`, `./schema`, `./question-types`, `./enums`, `./application-status`, `./candidate-list-filters`, `./document-list-filters`, `./default-rounds`, `./create-default-rounds`, `./kanban-cursor`, `./kanban-queries`, `./sqlite-helpers`. Add new exports to both the `exports` map in `package.json` and `index.ts` (or the relevant module).

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
- Secrets (OPENAI_API_KEY, NEXTCLOUD_*, BETTER_AUTH_SECRET, GOOGLE_CLIENT_*) live in the Cloudflare dashboard or `wrangler secret put` for production — never in `wrangler.jsonc` (deploy would overwrite dashboard values).
- Non-secret config lives in `wrangler.jsonc` vars: `BETTER_AUTH_URL`, `PRISMIC_REPOSITORY_NAME` (`darkalpha`), `PRISMIC_TEAM_MEMBER_TYPE` (`teammember`), `PRISMIC_OPERATING_MEMBER_TYPE` (`operatingmember`).
- `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` in `.env` are required only for `db:studio`.

## Auth (better-auth)

- Config: `apps/frontend/src/auth.ts`, Client: `apps/frontend/src/auth-client.ts`.
- **Email domain restriction is currently DISABLED** — `src/lib/auth-domain.ts` sets `isAllowedEmail()` to always return `true` (all sign-ins allowed temporarily). The enforcement hooks are still in `auth.ts`; re-enable by uncommenting the `@darkalphacapital.com` suffix check.
- Admin emails hardcoded in `src/auth.ts` (`rahul@`, `gaurav@`, `da@`); admin role is derived at session time via the `customSession` plugin (no admin flag column).
- Google OAuth enabled with **Calendar + Meet scopes** (`calendar.readonly`, `meetings.space.readonly`), `accessType: "offline"`, and `account.skipStateCookieCheck: true` (OAuth consent can exceed the cookie TTL — do not revert without reason). Changing scopes requires users to re-consent.
- Session helpers:
  - `fetchSession()` in `lib/auth-session.ts` — server function used in `beforeLoad` of layout routes.
  - `getSession()` in `lib/get-session.ts` (thin wrapper over `fetchSession()`).
  - `authGuard` / `adminGuard` in `lib/middleware/auth-guard.ts` — route-level middleware for server routes.
  - `serverFnAuthGuard` / `serverFnAdminGuard` in `lib/middleware/auth-guard.ts` — function middleware for server functions.
  - `apiAuthGuard` in `lib/middleware/api-auth-guard.ts` — middleware for API route handlers.

## Server function / data access pattern

- Mutations are `createServerFn` handlers in `apps/frontend/src/lib/actions/` (one file per entity/action, e.g. `sync-meet-attendance.ts`), wrapped with `.middleware([serverFnAuthGuard])` and Zod `.validator()`.
- Reads use TanStack Query options in `apps/frontend/src/lib/query/` (query-keys, options per entity) + `hooks/queries`. Invalidate via `lib/query/invalidate.ts`.
- API route conventions (for the `routes/api/*` handlers): Zod validation with `safeParse`, return 400 with `flatten().fieldErrors`; auth check via `getSession()` inline at the top; audit logs inserted inline with `.catch()` (fire-and-forget); structured JSON logging via `console.info(JSON.stringify({...}))`.

## File storage

- Documents stored in **Nextcloud** via WebDAV (`packages/nextcloud/`).
- Server-side client setup: `src/lib/nextcloud-server.ts` (`getServerNextcloudClient()`), upload wrapper: `src/lib/storage.ts`. Upload/view API routes: `routes/api/documents/`.
- Requires `NEXTCLOUD_URL`, `NEXTCLOUD_USER`, `NEXTCLOUD_PASSWORD` in `apps/frontend/.dev.vars` / Worker secrets.

## Cloudflare bindings (wrangler.jsonc)

- D1 binding `DB` → database `hr-automation-db`.
- Vectorize binding `VECTORIZE` → index `hr-documents-index` (reserved for RAG).
- Workflow `DOCUMENT_INDEXING_WORKFLOW` → `DocumentIndexingWorkflow` (`src/workflows/document-indexing.ts`).
- Workflow `INTERVIEW_EVALUATION_WORKFLOW` → `InterviewEvaluationWorkflow` (`src/workflows/interview-evaluation.ts`).
- Workflow `CANDIDATE_IMPORT_WORKFLOW` → `CandidateImportWorkflow` (`src/workflows/candidate-import.ts`, ~440 lines; delegates to `@workspace/candidate-import`).
- Durable Object `INTERVIEW_SESSION_DO` → `InterviewSessionDO` (`src/durable-objects/interview-session-do.ts`, ~2050 lines — realtime WebSocket + voice interviews).
- `@cloudflare/vite-plugin` handles Workers integration (configured in `vite.config.ts`).

## Voice interview system

- Docs: `docs/voice-interview-*.md` (architecture, client-side, prompting, reference) — read before touching this area.
- Audio flows browser↔OpenAI Realtime via WebRTC; `InterviewSessionDO` sends text commands over a separate "sideband" WebSocket (it never relays audio).
- Live voice flow: `interview/$token/index.tsx` + `hooks/useVoiceInterview.ts` + `lib/interview-realtime/ws-handler.ts`.
- Token API routes: `routes/api/interview-token/$token/*` (validate, schema, responses, start-voice, upload-audio, complete). Recordings → Nextcloud; session audio path persisted via `0008_session_audio_path` migration.
- Prompts/eval shared in `packages/interview-realtime/` (`prompts.ts`, `answer-evaluation.ts`).

## Attendance (Google Calendar/Meet)

- `src/lib/attendance/` syncs Google Meet attendance → D1 (relies on the Google Calendar/Meet OAuth scopes above).
- Actions: `sync-meet-attendance.ts` (aggregate, persist, resolve members by name against Prismic). API routes: `routes/api/attendance/*`.

## Prismic (headless CMS)

- `@prismicio/client` + `prismic.config.json` + `src/lib/prismic/` (client, config, member). Used to load team/operating members for attendance matching and docs pages. Non-secret config via wrangler vars (see env section).

## Testing

All tests use `bun test` with `--pass-with-no-tests`:

```bash
bun test --pass-with-no-tests    # single package
bun run test                     # all packages via turbo
```

Import from `bun:test`: `import { test, expect } from "bun:test";`

Test files exist in `apps/frontend/src/lib/__tests__/` and `attendance/__tests__/`, `packages/db/`, `packages/nextcloud/`, `packages/candidate-import/`, `packages/interview-realtime/`. No mocks for D1/WebDAV — pure-logic units only.
