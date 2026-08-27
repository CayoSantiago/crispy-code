# Electron desktop Ask + local Find (AI harness)

Date: 2026-08-27

## Problem

Ask and local Find live in `apps/web`, which is a hosted Next.js app. Local code search needs the user’s filesystem. Running that pipeline on the web stack (Postgres, Inngest, Better Auth) fights the product: Ask is about folders on this machine, not a multi-tenant cloud chat.

## Goal

Scaffold `apps/desktop` as an **Electron + Next.js AI harness** application, move Ask and local Find into it as a working MVP, and remove Ask/Find from `apps/web`.

## Decisions (locked)

| Topic | Choice |
| --- | --- |
| Ownership | Desktop owns Ask + local Find; web does not |
| Backend | Local-first: SQLite + in-process runner + Gemini; no Postgres/Inngest for Ask |
| Auth | None — single local user |
| Web Find | Remove entirely (including GitHub Find on web) |
| Integration | Next-in-Electron (Approach 1) |
| Bar | Working MVP end-to-end |

## Scope

In:

- New `apps/desktop` Electron + Next app in the pnpm/turbo monorepo
- Harness-oriented layout so desktop can grow into a general AI harness
- Ask UI + pipeline (plan → local search → stream answer) on the harness
- Local-only Find (folder config + ripgrep search UI)
- SQLite persistence for AskThread / AskTurn under `~/.crispy-code/`
- Reuse `~/.crispy-code/config.json` for local folder sources
- Remove `/ask`, `/find`, and their feature modules from `apps/web`
- Manual verification checklist for the MVP

Out:

- User accounts / Better Auth on desktop
- Postgres, Inngest, or Inngest realtime for Ask
- Migrating existing Postgres Ask threads into SQLite
- GitHub sources, mirrors, or GitHub Find on desktop or web
- Plugin marketplace, MCP host, multi-agent router
- Packaging/signing installers beyond “runs in dev”
- Adding a test runner to the repo
- Dropping unused `ask_*` tables from the shared Prisma schema (leave them; web just stops using them)

## Architecture

**Process model**

- **Electron main** starts a local Next.js server, opens a `BrowserWindow` to it, owns window lifecycle and quit.
- **Next (Node)** hosts UI and server procedures for Ask + Find.
- Desktop does not use `@repo/auth`, `@repo/db`, `@repo/jobs`, or `@repo/email`.

**Disk layout (`~/.crispy-code/`)**

- `config.json` — local folder sources (same path as today)
- `ask.sqlite` — AskThread / AskTurn persistence

**Ask runner**

In-process async job in the Next server (same stages as today’s Inngest function: planning → searching → writing), without `step.run` or Inngest realtime. Streaming uses a **local SSE** endpoint for turn events (stages, answer tokens, thinking). No Inngest realtime tokens.

**Harness direction**

Desktop is an AI harness shell. Ask is the first workflow on top of harness seams (run a turn, stream events, register tools, persist thread/turn state). Find’s ripgrep path is exposed as a harness tool (e.g. `search_local`) that Ask calls, not only as a hard-wired side path inside Gemini glue. This MVP ships the seams and one tool/workflow — not a full agent platform.

## Components & module boundaries

**`apps/desktop`**

- `electron/` — main + preload (window + start/stop Next)
- `app/` — Next routes: `/ask` (Ask home), `/ask/[threadId]`, `/find`; `/` redirects to `/ask`
- `features/harness/` — turn runner, event stream, tool registry
- `features/ask/` — Ask UX + prompts on the harness (adapted from `apps/web`)
- `features/find/` — local folder config + ripgrep; Find UI + `search_local` tool (GitHub sync/mirror code not ported)
- `lib/harness-db/` — thin SQLite access for threads/turns

**Shared (keep using)**

- `@repo/ui`, typescript/biome configs, catalog deps (`next`, `react`, `ai`, `@ai-sdk/google`, etc.)

**`apps/web` removals**

- `features/ask`, `features/find`
- App routes `/ask`, `/find`
- Nav / `data/routes` entries
- Ask proxy matcher
- Ask Inngest function registration and related wiring

Web keeps auth, email, git viewer, component showcase routes, and the rest of the marketing/product surface.

## Data flow

**Find (config)**  
UI → server procedure → read/write `~/.crispy-code/config.json` → list/add/remove local folders only. Writes use temp file + rename so a crash does not corrupt config.

**Find (search)**  
UI → server → ripgrep over configured local sources → grouped hits (reuse clustering / evidence-cap logic).

**Ask turn (happy path)**

1. User submits a Question (new thread or follow-up).
2. Server creates AskThread (if needed) + AskTurn in SQLite (`RUNNING`, stage `PLANNING`).
3. Harness runner:
   - Gemini plans 1–3 searches (or fallback plan)
   - Stage `SEARCHING` → harness tool `search_local` → Evidence
   - Stage `WRITING` → Gemini streams Answer (+ session-only Thinking)
   - Persist Answer/Evidence; mark turn `COMPLETED`
4. Client streams stage/token updates over the local SSE endpoint; reload reads SQLite.

Domain language stays as in `CONTEXT.md`: AskThread, AskTurn, Question, Answer, Thinking, Search Progress, Evidence.

## Error handling

- **No local folders:** Turn fails fast with a clear message and link to `/find`.
- **Missing `GEMINI_API_KEY`:** App boots; Ask shows a banner and blocks submit. Key lives in `apps/desktop/.env.local` (passed explicitly to the Google provider, same as web).
- **Gemini plan failure:** Fallback to a single literal search from the question.
- **Ripgrep / missing path:** Source marked missing; other sources still searched; empty Evidence is allowed and the answer should say so.
- **Turn crash mid-run:** Mark turn `FAILED` with message; client stops streaming and shows failure on the turn.
- **Concurrent follow-up:** Reject starting another turn on a thread while one is `RUNNING`.
- **SQLite / config I/O errors:** Surface as procedure errors; config writes stay atomic.

## Testing

No automated test runner in this repo; this work does not add one.

**Manual verification (required for working MVP)**

1. `pnpm --filter desktop dev` opens Electron + Next.
2. Add a local folder in `/find`, run a search, see hits.
3. Ask a question; see planning → searching → writing; Evidence + Answer persist across reload.
4. Follow-up on the same thread; rename/delete in history.
5. `apps/web` no longer exposes `/ask` or `/find` (routes and nav gone).

**Seams for a future runner:** harness tool `search_local`, SQLite turn state machine, Gemini fallback plan, atomic config write.
