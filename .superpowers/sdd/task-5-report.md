# Task 5 Report: Port local Find into desktop

## Status

**DONE**

## Commits

- `117719b` — feat(desktop): port local Find search and config
- `fc96428` — fix(desktop): satisfy Find build type constraints
- `39b1ce8` — chore(desktop): align Find port with Biome

All commits are pushed to `origin/cursor/electron-desktop-ask-a26d`.

## Verification

```bash
pnpm --filter desktop build
# Exit 0 — /find and /find/file built successfully

pnpm --filter desktop check-types
# Exit 0 — tsc --noEmit passed

node --experimental-strip-types --test features/find/core.test.mjs
# Exit 0 — 3/3 tests passed

pnpm exec biome check <Task 5 files>
# Exit 0 — 44 files checked, no diagnostics
```

The environment uses Node 22 while the repository declares Node >=24, so pnpm
prints an engine warning. The build and all requested verification still pass.

## Implementation

- Ported Find config schemas and serialized config updates. Writes use a unique
  same-directory temporary file followed by `rename`; failed writes clean up the
  temporary file.
- Kept `githubRepos` parsing/defaults solely for compatibility with an existing
  web `config.json`. Search source discovery uses only `localRoots`.
- Ported ripgrep JSON search, result clustering/truncation, evidence capping,
  and Find-owned `loadLocalSources` / `runLocalSearches`.
- Added only `getConfig`, `search`, `addLocalRoot`, and `removeLocalRoot` to the
  Find router, then mounted it at `appRouter.find`.
- Ported local source management, search controls/results, hit rendering,
  syntax highlighting, file inspection, image preview, and hex preview.
- Added `/find` and `/find/file`; file access is restricted to configured local
  roots.
- Added the direct UI dependencies used by the port:
  `@dev.icons/react`, `@tanstack/highlight`, and
  `class-variance-authority`.

## Spec Compliance

| Requirement | Status |
|-------------|--------|
| Local-only Find config/search/UI/routes | ✅ |
| Backward-compatible `githubRepos` config parsing | ✅ |
| Atomic config write via temp file + rename | ✅ |
| Exactly four Find oRPC procedures | ✅ |
| `local-search.ts` and `cap-evidence.ts` owned by Find | ✅ |
| No `search_local` registration | ✅ |
| No Ask/SSE/Gemini implementation | ✅ |
| No changes or deletions in `apps/web` | ✅ |

## Self-Review

### Standards

- Read the installed Next 16 App Router guidance before porting routes.
- Preserved Suspense boundaries around clients that consume search params.
- Kept the future Task 6 boundary independent of unavailable Ask schemas by
  defining a structurally compatible `PlannedLocalSearch` type in Find.
- Added focused tests for cluster boundaries, match-budget truncation, and the
  global evidence file cap.
- Focused Biome and TypeScript checks pass with a clean Git worktree.

### Concerns

- Ripgrep must be available on the desktop host's `PATH`, matching the web
  implementation and plan assumption.
- Config compatibility retains GitHub-shaped schema/type fields, but they are
  not searched, displayed, mutated, synced, or exposed as procedures.
- `search_local` remains intentionally unregistered until Task 6.

## Deviations

- The full plan's copied `search-local.ts` depended on Task 6's not-yet-created
  `PlannedSearch`. This port names the identical Find-owned shape
  `PlannedLocalSearch`; Task 6's `PlannedSearch[]` is structurally assignable.
- Three small follow-up commits were needed after the required feature commit:
  one for declaration/nullability build constraints and one for repository lint
  compliance.

## Review Fixes

- `fce2c47` — fix(desktop): address Find review findings
- `c6e5318` — chore(desktop): format Find search fix
- Enforced `maxResultsPerSource` across each source's complete ripgrep stream
  and stopped ripgrep when the source budget is reached.
- Invalidated active Find search queries after adding a local root.
- Preserved absolute-path case in local root IDs so case-distinct Linux paths
  cannot collide.
- Added regression coverage for source-wide match budgets and case-distinct
  local root IDs.

```bash
pnpm --filter desktop check-types
# Exit 0 — tsc --noEmit passed (Node 22 vs declared Node >=24 warning only)

pnpm exec biome check <6 touched Find files>
# Exit 0 — 6 files checked, no diagnostics

node --experimental-strip-types --test features/find/core.test.mjs
# Exit 0 — 5/5 tests passed
```
