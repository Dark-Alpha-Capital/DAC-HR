# AGENTS.md (Operator Guide)

This file is for agentic coding tools working in this repo.

## Repository Overview

- Monorepo (workspaces): `apps/*`, `packages/*` (Turborepo)
- Main app: `apps/web/` (Next.js App Router)
- Shared packages:
  - `packages/db/` Drizzle ORM schema/queries + DB scripts
  - `packages/ui/` shared shadcn/ui components (`@workspace/ui`)
  - `packages/eslint-config/`, `packages/typescript-config/` shared configs
- Runtime/tooling: prefer `bun` for local commands.

## Agent Rules (local)

- Cursor rules: none found in `.cursor/rules/` or `.cursorrules`.
- Copilot rules: none found in `.github/copilot-instructions.md`.
- Do not add new rule systems unless requested.

## Commands (Build / Lint / Typecheck / “Tests”)

### Install

- `bun install`

### Dev

- Run everything: `bun run dev` (Turbo)
- Run web only: `bun --cwd apps/web run dev` (Next dev w/ Turbopack)

### Build

- Build all: `bun run build`
- Build web only: `bun --cwd apps/web run build`

### Lint

- Lint all (Turbo): `bun run lint`
- Lint web only: `bun --cwd apps/web run lint`
- Lint web and autofix: `bun --cwd apps/web run lint:fix`
- Lint UI package: `bun --cwd packages/ui run lint`

**Target a single file (closest thing to “single test”)**

- Next lint supports file targeting:
  - `bun --cwd apps/web run lint -- --file app/(main-site)/page.tsx`
- Any ESLint script can take file args:
  - `bun --cwd packages/ui run lint -- src/components/button.tsx`

**Turbo filtering (fast iteration)**

- `bun run lint -- --filter=web`
- `bun run build -- --filter=@workspace/ui`

### Typecheck

- Web only: `bun --cwd apps/web run typecheck`

### Formatting

- Format (repo): `bun run format`
  - Runs `prettier --write "**/*.{ts,tsx,md}"`

### Tests

- There is no dedicated unit/integration test runner configured in this repo.
- Treat these as “required checks”:
  - `bun run lint`
  - `bun --cwd apps/web run typecheck`
- For behavior changes, do focused manual validation (run the app, hit the route, verify UI).

## Database (Drizzle / Postgres)

From `packages/db/`:

- Generate migrations: `bun --cwd packages/db run db:generate`
- Run migrations: `bun --cwd packages/db run db:migrate`
- Seed: `bun --cwd packages/db run db:seed`
- Studio: `bun --cwd packages/db run db:studio`

Local dev uses Docker:

- Start DB/redis: `docker-compose up -d`
- App container (prod-like): `docker-compose up -d --build` (web at `http://localhost:3001`)

## Project Structure (where to change things)

- UI pages/routes: `apps/web/app/` (Next.js App Router)
- API route handlers: `apps/web/app/api/**/route.ts`
- Server actions (preferred for UI mutations): `apps/web/lib/actions/`
- Zod input schemas: `apps/web/lib/schemas/`
- DB schema + tables: `packages/db/schema.ts`
- DB access helpers/queries: `packages/db/queries.ts`

## Code Style Guidelines

### Language / Modules

- TypeScript everywhere; packages are ESM (`"type": "module"`).
- Prefer `async/await` over raw promise chains.
- Keep functions small; prefer extracting helpers over deeply nested blocks.

### Formatting

- Prettier is the source of truth. Don’t hand-format.
- Run `bun run format` before finishing a change if files were touched.

### Imports

- Use absolute imports where configured:
  - In `apps/web`: `@/…` maps to `apps/web/*` via `paths` in `apps/web/tsconfig.json`.
  - Workspace packages: `@workspace/db`, `@workspace/ui/...`.
- Prefer `import type { X } from "..."` for type-only imports.
- Group imports by intent (recommended order):
  1. Node/standard libs (rare in web)
  2. External deps
  3. `@workspace/*`
  4. `@/*`
  5. Relative imports (`./`, `../`)

### Naming

- React components: `PascalCase.tsx`.
- Hooks: `useSomething.ts`.
- Server actions: `kebab-case.ts` or `verb-noun.ts` (existing pattern varies; match the folder).
- Next route segments: follow Next conventions; prefer kebab-case folder names.
- Zod schemas:
  - Runtime schema: `somethingSchema`
  - Inferred type: `SomethingSchema` (type alias) or `SomethingFormSchema` (existing pattern).

### Types & Validation

- TS is `strict` with `noUncheckedIndexedAccess` (see `packages/typescript-config/base.json`).
- Prefer validating inputs at boundaries:
  - Server actions + API routes should `safeParse` with Zod schemas.
  - Return validation errors in a structured way.

### Error Handling (match existing patterns)

- Server actions (`apps/web/lib/actions/*`):
  - Authenticate early (`auth.api.getSession({ headers: await headers() })`).
  - On auth failure, return `{ error: "Unauthorized" }`.
  - On validation failure, return `{ error: zodError.flatten().fieldErrors }`.
  - Wrap DB calls in `try/catch`; return a user-safe message.

- Route handlers (`apps/web/app/api/**/route.ts`):
  - Prefer `NextResponse.json({ error }, { status })`.
  - Use `400` for validation errors, `401/403` for auth, `500` for unexpected failures.

- Logging:
  - Prefer contextual logs (route name, entity id) over generic `console.log`.
  - Never log secrets or raw credentials.

### Auth

- Auth is `better-auth`.
- Common patterns:
  - Server actions: `auth.api.getSession({ headers: await headers() })`.
  - API routes: `requireAuth()` middleware returns either user info or a `NextResponse`.

### Data Access

- Prefer using Drizzle via `@workspace/db`.
- Keep query logic inside `packages/db/queries.ts` when it’s reused.
- When adding new env vars affecting builds, update `turbo.json` env lists to avoid `turbo/no-undeclared-env-vars` warnings.

### Caching / Revalidation

- Server actions often call `updateTag(...)` and/or `revalidatePath(...)` after mutations.
- Audit logging is often done non-blockingly via `after(async () => ...)`.

## Security & Configuration

- Do not commit secrets (`.env`, private keys, tokens).
- If you introduce new env vars, update:
  - `apps/web/.env.example`
  - `turbo.json` task env list (if used during build)
- Treat `service-account-key.json` as sensitive; avoid modifying or propagating it.

## Practical Agent Workflow

1. Identify scope (`apps/web` vs `packages/*`).
2. Make the smallest possible code change.
3. Run targeted checks:
   - `bun --cwd apps/web run lint -- --file <changed-file>` (web)
   - `bun --cwd apps/web run typecheck` for TS-heavy changes
4. Run `bun run format` if formatting drift is likely.
