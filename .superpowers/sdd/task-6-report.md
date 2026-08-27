# Task 6 Report: Port Ask onto harness

## Status

**DONE**

## Commits

- `8ec25ff` — feat(desktop): port Ask onto local harness with SSE
- `07f97c9` — fix(desktop): block Ask until config status loads

All implementation commits are pushed to
`origin/cursor/electron-desktop-ask-a26d`.

## Verification

```bash
pnpm --filter desktop check-types
# Exit 0 — tsc --noEmit passed

pnpm --filter desktop build
# Exit 0 — Next compiled, typechecked, and generated all pages
# Routes include /ask, /ask/[threadId], /api/ask/turn-events, and /rpc

pnpm exec biome check <Task 6 files>
# Exit 0 — 22 files checked, no diagnostics

node --experimental-strip-types --test \
  apps/desktop/features/ask/core.test.mjs \
  apps/desktop/features/find/core.test.mjs
# Exit 0 — 7/7 tests passed
```

The existing desktop server returned the Ask page successfully, and the SSE
route returned the expected HTTP 400 response when `turnId` was omitted.
The environment uses Node 22 while the repository declares Node >=24, so pnpm
prints an engine warning; all required checks and the production build pass.

## Implementation

- Ported Ask schemas, title derivation, and Gemini planning/answer streaming.
  Gemini uses `@/lib/env`, the default fetch implementation, and model
  `gemini-3.5-flash`.
- Registered the Find-owned `search_local` harness tool once per process.
- Implemented `runAskTurn` with planning, fallback search planning, local
  search, persisted search evidence, throttled answer persistence, streaming
  Thinking/Answer events, completion, and failure handling.
- Empty local source configuration fails an AskTurn with
  `No local folders configured for Ask.` and publishes terminal events.
- Added unauthenticated Ask oRPC procedures for status, start, get/list,
  delete, and rename. Follow-ups are rejected while an AskTurn is RUNNING with
  the required BAD_REQUEST message.
- Added local SSE streaming at `/api/ask/turn-events?turnId=...` and an
  `EventSource` hook that accumulates Thinking and Answer tokens.
- Ported the Ask shell, status badges, composer, AskThread rendering, evidence
  display, history, rename/delete controls, and dynamic route.
- Added RUNNING-only 400ms `getThread` polling so persisted stage/status
  changes reconcile with the live SSE stream.
- Ask submit controls remain disabled until both Gemini status and local
  folder configuration have loaded and are valid.

## Spec Compliance

| Requirement | Status |
|-------------|--------|
| No auth, Inngest, `@repo/db`, jobs, or email in desktop Ask | ✅ |
| Gemini default fetch and `gemini-3.5-flash` | ✅ |
| `search_local` registered through Find | ✅ |
| Fire-and-forget in-process `runAskTurn` | ✅ |
| Concurrent RUNNING follow-up BAD_REQUEST | ✅ |
| Empty local folders fail the AskTurn | ✅ |
| Missing key banner and submit blocking | ✅ |
| Local SSE token stream | ✅ |
| Ask oRPC mounted beside Find | ✅ |
| Rename preserves `updatedAt` | ✅ |
| AskThread/AskTurn domain language | ✅ |
| No deletion or modification of web Ask/Find | ✅ |

## Self-Review

### Standards

- Read the installed Next 16 Route Handler guide before adding the SSE route.
- Preserved the harness boundaries: Find owns local search, harness owns tool
  registration/events/runs, and Ask owns Gemini/UI/oRPC behavior.
- Kept server-only Ask procedures free of web authentication and infrastructure
  dependencies.
- Added focused title normalization/truncation tests and reran the existing
  Find core suite.
- Final Git worktree was clean and matched the pushed remote branch.

### Concerns

- SSE events are intentionally in-memory and require the persistent,
  single-process Electron-hosted Next server described by the plan.
- A live Gemini request was not made during automated verification; build,
  type, lint, route, and local unit verification all passed.
- The Node 22 verification VM emits engine and experimental SQLite/type
  stripping warnings; the project target remains Node >=24.

## Notes

- The first post-change typecheck compared stale `.next/types` declarations
  with current `.next/dev/types`. `next typegen` regenerated route declarations,
  after which both `check-types` and the production build passed.

## Review Fix: SSE Subscription Race

### Fix notes

- Harness events now retain each turn's latest stage plus accumulated thinking
  and answer text. New subscribers receive that snapshot before subsequent live
  events, so an EventSource opened after `start` does not lose early tokens.
- Terminal snapshots remain replayable for 60 seconds, covering turns that
  finish before the browser completes its SSE connection without retaining
  completed output indefinitely.
- Persisted and streamed answers are reconciled only when one is a prefix of
  the other. Divergent streamed text can no longer replace persisted content
  merely because it is longer.
- Added regression coverage for running-turn replay, terminal replay, and
  persisted/streamed answer reconciliation.

### Review-fix verification

```bash
pnpm --filter desktop check-types
# Exit 0 — tsc --noEmit passed

node --experimental-strip-types --test \
  apps/desktop/features/ask/core.test.mjs \
  apps/desktop/features/find/core.test.mjs \
  apps/desktop/features/harness/events.test.mjs
# Exit 0 — 11/11 tests passed

pnpm exec biome check \
  apps/desktop/features/ask/components/ask-thread.tsx \
  apps/desktop/features/ask/core.test.mjs \
  apps/desktop/features/ask/reconcile-turn-answer.ts \
  apps/desktop/features/harness/events.ts \
  apps/desktop/features/harness/events.test.mjs
# Exit 0 — 5 files checked, no diagnostics
```
