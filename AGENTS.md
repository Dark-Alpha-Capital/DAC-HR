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
**Cloudflare dashboard (Workers Builds):** set the build command to `cd apps/frontend && bun install && bun run build:prod` (`build:prod` = `db:migrate:remote && vite build`) so remote D1 migrations apply before every build/deploy. It must run from `apps/frontend/` so `wrangler.jsonc` + the `db:migrate:remote` script resolve.

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
- Migrations: `packages/db/drizzle/` (SQL files `0000`–`0020`) — applied via `wrangler d1 migrations apply` / scripts below. `drizzle/meta/_journal.json` + snapshots are kept in sync (last snapshot `0020_snapshot.json` reflects the current schema); `db:generate` should print "No schema changes, nothing to migrate" when the schema hasn't changed, and `db:check` fails the build if it would produce a new migration. If `db:generate` ever proposes re-creating existing tables, the journal/snapshot drifted — re-sync it (see git history) rather than applying that migration.
- Repositories: `packages/db/repositories/` (9 files: audit, candidate, candidate-import, document, interview, interview-bundle, interview-session, meet-attendance, screener).

```bash
cd packages/db
bun run db:generate      # generate migrations from schema changes
bun run db:check         # fail if schema.ts has pending changes (drift guard — run before pushing)
bun run db:migrate       # apply migrations to local D1 (alias: db:migrate:local)
bun run db:migrate:remote # apply migrations to remote D1
bun run db:reset:local   # wipe local .wrangler/state + re-apply all migrations from scratch
bun run db:seed          # seed local D1
bun run db:seed:remote   # seed remote D1
bun run db:studio        # drizzle studio — needs CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN in apps/frontend/.env
bun run db:seed-positions        # + :remote variant
bun run db:reset-rounds          # + :remote variant
bun run db:finalize-interview-schema  # + :remote variant
```

**Sync model (schema → local → remote):** `packages/db/schema.ts` is the single source of truth. Schema changes go through `db:generate` (creates a numbered SQL file + journal/snapshot), then `db:migrate` (local) and `db:migrate:remote` (remote). `deploy` runs `db:migrate:remote` before building, so remote applies every migration in order before serving the new code. Run `db:migrate` + `db:check` locally after pulling schema changes so the local D1 matches the migration journal.

**Local state corruption (`_cf_ALARM ... SQLITE_ERROR`):** when workerd/wrangler is upgraded, the on-disk `.wrangler/state` sqlite (D1, Durable Object alarms, workflows) can become unreadable — every local wrangler command dies with a SQLite error before running. The state is dev-ephemeral and gitignored; fix with `bun run db:reset:local` (clears `.wrangler/state` and re-applies all migrations). Note `db:seed`/`db:seed-positions` currently fail under plain `bun` because `@workspace/db/db` imports `cloudflare:workers`; run seeds through a Workers-context (wrangler dev) if needed.

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
- **Local dev uses a LOCAL D1 database** (`vite.config.ts` sets `remoteBindings: false`; `wrangler.jsonc` D1 binding has `remote: false`). No `wrangler login` needed for dev. Run `bun run db:migrate` after pulling schema changes so the local D1 stays in sync. Vectorize stays remote-only (used only by the document-indexing workflow).
- To temporarily run dev against remote/production bindings, set `remoteBindings: true` in `vite.config.ts` (or set `CLOUDFLARE_VITE_FORCE_LOCAL=true` to force local regardless).
- Secrets (OPENAI_API_KEY, NEXTCLOUD_*, BETTER_AUTH_SECRET, GOOGLE_CLIENT_*) live in the Cloudflare dashboard or `wrangler secret put` for production — never in `wrangler.jsonc` (deploy would overwrite dashboard values).
- Non-secret config lives in `wrangler.jsonc` vars: `BETTER_AUTH_URL`, `PRISMIC_REPOSITORY_NAME` (`darkalpha`), `PRISMIC_TEAM_MEMBER_TYPE` (`teammember`), `PRISMIC_OPERATING_MEMBER_TYPE` (`operatingmember`).
- `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` in `.env` are required only for `db:studio`.

## Auth (better-auth)

- Config: `features/auth/server/auth-service.ts` (host re-exported from `lib/auth.ts`), Client: `features/auth/client.ts`.
- **Email domain restriction is currently DISABLED** — `features/auth/helpers.ts` sets `isAllowedEmail()` to always return `true` (all sign-ins allowed temporarily). The enforcement hooks are still in `auth-service.ts`; re-enable by uncommenting the `@darkalphacapital.com` suffix check.
- Admin emails hardcoded in `features/auth/server/auth-service.ts` (`rahul@`, `gaurav@`, `da@`); admin role is derived at session time via the `admin()` plugin (no admin flag column).
- Google OAuth enabled with **Calendar + Meet scopes** (`calendar.readonly`, `meetings.space.readonly`), `accessType: "offline"`, and `account.skipStateCookieCheck: true` (OAuth consent can exceed the cookie TTL — do not revert without reason). Changing scopes requires users to re-consent.
- Session helpers:
  - `fetchSession()` in `lib/auth-session.ts` — server function used in `beforeLoad` of layout routes.
  - `getSession()` / `getSessionUser()` in `features/auth/server/get-session-user.ts` — centralized session resolver.
  - `serverFnAuthGuard` / `serverFnAdminGuard` in `features/auth/server/auth-middleware.ts` — shared function middleware for server functions (the one place session auth lives).
  - `apiAuthGuard` in `lib/middleware/api-auth-guard.ts` — middleware for API route handlers.

## Server function / data access pattern

- Every domain follows one shape: `features/<domain>/server/<domain>-service.ts` owns **all** persistence + business logic for the domain and is the only file importing `@workspace/db`. Export a plain object: `export const <domain>Service = { getX, createY, ... }`.
- Reads/writes are thin `createServerFn` handlers under `features/<domain>/server/queries/` and `server/mutations/` (one file per action), wrapped with `.middleware([serverFnAuthGuard])`, optional Zod `.validator()`, and a handler that reads `context.user`/`context.session` and delegates to one `<domain>Service` method. No inline SQL, no business logic in server fns.
- Schemas/types/constants live in the feature: `schemas.ts` (zod + inferred types), `constants.ts` (option lists/labels), `helpers.ts` (pure helpers), `types.ts` (entity types, re-exported from the db package). Components and server fns both import from these.
- Client query options/parse helpers live in `features/<domain>/query-options.ts` (not in `server/queries/`).
- Routes are shells: `createFileRoute` + optional `beforeLoad`/`loader` calling a server fn + a component that renders the feature component.
- API routes (`routes/api/*`) delegate to `<domain>Service` methods — they never import `@workspace/db` directly. Audit logging lives inside service methods (fire-and-forget `.catch()`).
- Cross-feature shared constants/types are promoted: `lib/application-status.ts`, `lib/enums.ts`, `lib/question-types.ts` re-export the db package's pure submodules. Sweep invariant: `rg 'from "@workspace/db'` in `apps/frontend/src` matches only `*-service.ts`, feature `types.ts`/`constants.ts`, and the three `lib/` hubs above.

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

- Ported from `dac-googlemeet`. D1 tables `meet_conference` + `meet_attendee` hold persisted firm-wide Meet attendance (relies on the Google Calendar/Meet OAuth scopes above).
- Routes under `_main/employees/attendance/`: `index.tsx` (Meetings list), `$conferenceId.tsx` (per-meeting attendance), `meeting-attendance.tsx` (firm-wide data table + Sync button).
- `src/lib/attendance/meet-auth.ts` resolves the Google access token; `meet-attendance.ts` is the client-safe Meet API + Calendar-title-matching core (fetch only).
- Server functions in `lib/actions/sync-meet-attendance.ts`: `getMeetConferences`, `getMeetConferenceDetail`, `getStoredAttendance`, `prepareAttendanceSync`, `syncAttendanceChunk`.
- Persistence: `packages/db/repositories/meet-attendance-repository.ts` (`persistConferenceAttendance`, `listStoredAttendanceRows`).

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
