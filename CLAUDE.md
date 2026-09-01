# OCOS — OPA Community OS

## Purpose
Community platform and toolkit for the Open Process Automation (OPA / O-PAS) ecosystem. Brings together knowledge graph (capabilities mapped to O-PAS layers), execution tools (architecture builder, migration strategy builder, RFP generator), vendor capability registry with community validation, project workspaces, and an AI assistant grounded in O-PAS context. Free-to-join freemium model. Imported from Manus 2026-05-05.

## Stack
- **Client:** React 19, Vite 7, TypeScript, TailwindCSS 4, shadcn/ui (Radix), wouter (routing), TanStack Query, Tiptap editor, Framer Motion
- **Server:** Node + Express, tRPC v11, Drizzle ORM, MySQL2, JOSE (JWT), bcryptjs, nodemailer, node-cron
- **Storage:** S3 (AWS SDK v3) for media uploads
- **Tests:** Vitest (71 tests passing per todo.md)
- **Package manager:** pnpm 10.4.1

## Layout
- `client/` — React frontend (src + public + index.html)
- `server/_core/` — Express entry, tRPC routers
- `server/*.test.ts` — Vitest test files (auth, forum, digest, etc.)
- `server/email.ts`, `digestCron.ts`, `eventReminderCron.ts`, `workflows.ts` — backend services
- `shared/` — types and constants shared client/server (`shared/schema.ts` is the Drizzle schema)
- `drizzle/` — 26 migrations (0000-0025), `schema.ts`, `relations.ts`
- Root `.mjs` and `.py` scripts — one-off migrations and seed scripts (run-migration*.mjs, seed-*.mjs, fix-db-duplicates.py, replace-digest*.py)
- `todo.md` — exhaustive feature checklist; treat as the source of truth for what's built

## Commands
- Install: `pnpm install`
- Dev: `pnpm dev` (runs `tsx watch server/_core/index.ts`, NODE_ENV=development)
- Build: `pnpm build` (vite build + esbuild server bundle to `dist/`)
- Start (prod): `pnpm start`
- Typecheck: `pnpm check`
- Format: `pnpm format`
- Test: `pnpm test`
- DB migrate: `pnpm db:push` (drizzle-kit generate && migrate)

## Conventions
- ESM throughout (`"type": "module"`)
- tRPC for all client↔server calls — no REST endpoints
- Drizzle for all DB access; raw SQL only in seed scripts
- shadcn/ui components live in `client/src/components/ui` (per `components.json`)
- Tests colocated next to server code as `*.test.ts`
- One patch in `patches/wouter@3.7.1.patch` (kept via pnpm patchedDependencies)

## Environment
Required env vars (see `server/_core/env.ts` for the canonical list):
- `DATABASE_URL` — MySQL connection
- `JWT_SECRET` — session cookie signing secret
- `APP_BASE_URL` — public URL used in email links (defaults to `http://localhost:3000`)
- `ANTHROPIC_API_KEY` — for the AI assistant, RFP generator, migration plan, capability evaluation
- `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT` (or `R2_ACCOUNT_ID`) — Cloudflare R2 for media uploads
- `OWNER_EMAIL` — receives owner-side notifications and auto-promotes that user to admin on upsert
- `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_FROM` — Resend (or any) SMTP creds
- `PORT` — HTTP listen port (default 3000)

`todo.md` is the canonical project log — keep maintaining it. Manus working notes from the original import are archived under `docs/manus-archive/`.

## Don'ts
- Don't switch package managers — pnpm is required (patchedDependencies + overrides in package.json depend on it)
- Don't bypass tRPC for new endpoints
- Don't edit drizzle migrations after they're committed — add a new one
