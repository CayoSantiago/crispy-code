# Zod Schema Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Validate every untrusted data boundary in `apps/web` with zod schemas, deriving types via `z.infer` so types and runtime validation cannot drift.

**Architecture:** Colocated schemas inside `apps/web` — each boundary owns its schema next to the code that uses it. GitHub schemas validate only the fields the app uses (zod objects ignore unknown keys by default). A tiny shared `formatIssues` helper turns `ZodError`s into one-line messages.

**Tech Stack:** zod ^4.4.3 (zod **4** — not zod 3), Next.js 16.2.6 App Router, TypeScript strict, pnpm + Turborepo, Biome.

**Spec:** `docs/superpowers/specs/2026-08-02-zod-validation-design.md`

## Global Constraints

- zod version: `^4.4.3` (matches `@repo/ui`). Use zod 4 APIs only: `z.stringbool()`, `.default()` takes the **output** type, `error.issues` (not `error.errors`), `z.ZodType<T>`.
- No behavior changes for valid data. Error messages shown to users must stay identical where the plan says so.
- GitHub schemas: used fields only. Do not model fields the app never reads.
- No test framework exists and adding one is out of scope. Each task is verified with `pnpm --filter web typecheck` and `pnpm lint` from the repo root; the final task does end-to-end manual verification.
- Code style: Biome — single quotes, no semicolons. Run `pnpm lint:fix` before each commit to fix import ordering/formatting automatically.
- Next.js 16: `params`/`searchParams` are Promises (existing code already awaits them — keep that). Bundled docs live at `node_modules/next/dist/docs/` if a Next API question comes up.
- The client entry point `fetchGitHub` must keep its documented "never throws" contract: schema failures return `{ status: 'error', message }`, which existing consumers already surface (pages throw to error boundaries, the lookup action renders it).

---

### Task 1: Add zod and the search contract schemas

**Files:**
- Modify: `apps/web/package.json` (via pnpm)
- Create: `apps/web/lib/validation.ts`
- Create: `apps/web/lib/find/search-schema.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces:
  - `formatIssues(error: z.ZodError): string` from `@/lib/validation`
  - From `@/lib/find/search-schema`: `searchRequestSchema`, `searchResponseSchema`, `searchMatchSchema`, and types `SearchMode`, `SearchRequest`, `SearchMatch`, `SearchResponse` (all `z.infer`-derived). Later tasks import these exact names.

- [ ] **Step 1: Add the dependency**

Run from the repo root:

```bash
pnpm --filter web add zod@^4.4.3
```

Expected: `apps/web/package.json` gains `"zod": "^4.4.3"` in `dependencies`, lockfile updates.

- [ ] **Step 2: Create the shared error formatter**

Create `apps/web/lib/validation.ts`:

```ts
import type { z } from 'zod'

export function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) =>
      issue.path.length
        ? `${issue.path.join('.')}: ${issue.message}`
        : issue.message,
    )
    .join('; ')
}
```

- [ ] **Step 3: Create the search contract schemas**

Create `apps/web/lib/find/search-schema.ts`. Notes: `z.stringbool()` parses `'true'`/`'false'` strings to booleans (zod 4); `.default()` applies when the key is absent, which is how `Object.fromEntries(searchParams)` represents missing params.

```ts
import { z } from 'zod'

export const searchModeSchema = z.enum(['literal', 'regex'])

export const searchRequestSchema = z.object({
  query: z.string().trim().min(1, 'Missing query parameter.'),
  mode: searchModeSchema.default('literal'),
  caseSensitive: z.stringbool().default(false),
  wholeWord: z.stringbool().default(false),
  extension: z.string().default(''),
  pathFilter: z.string().default(''),
  sourceFilter: z.string().default(''),
})

export const searchMatchSchema = z.object({
  sourceId: z.string(),
  sourceLabel: z.string(),
  sourceKind: z.enum(['local', 'github']),
  absolutePath: z.string(),
  relativePath: z.string(),
  lineNumber: z.number(),
  lineText: z.string(),
  matchRanges: z.array(z.object({ start: z.number(), end: z.number() })),
  projectName: z.string(),
})

const sourceRefSchema = z.object({ id: z.string(), label: z.string() })

export const searchGroupSchema = z.object({
  sourceId: z.string(),
  sourceLabel: z.string(),
  projectName: z.string(),
  sourceKind: z.enum(['local', 'github']),
  matches: z.array(searchMatchSchema),
})

export const searchResponseSchema = z.object({
  groups: z.array(searchGroupSchema),
  totalMatches: z.number(),
  missingSources: z.array(sourceRefSchema),
  sourceOptions: z.array(sourceRefSchema),
  recentSearches: z.array(z.string()),
})

export type SearchMode = z.infer<typeof searchModeSchema>
export type SearchRequest = z.infer<typeof searchRequestSchema>
export type SearchMatch = z.infer<typeof searchMatchSchema>
export type SearchResponse = z.infer<typeof searchResponseSchema>
```

- [ ] **Step 4: Verify**

Run: `pnpm --filter web typecheck && pnpm lint:fix && pnpm lint`
Expected: both pass (new files are not imported yet, so nothing can break).

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/lib/validation.ts apps/web/lib/find/search-schema.ts
git commit -m "feat(find): add zod and search contract schemas"
```

---

### Task 2: Validate the search route request

**Files:**
- Modify: `apps/web/app/api/find/search/route.ts` (whole file below)

**Interfaces:**
- Consumes: `searchRequestSchema` from `@/lib/find/search-schema`, `formatIssues` from `@/lib/validation` (Task 1); `executeSearch(options: SearchOptions, signal?: AbortSignal)` from `@/lib/find/search-service` (existing, unchanged).
- Produces: `GET /api/find/search` now returns 400 with `{ error: string, issues: ZodIssue[] }` for any invalid param (missing/empty `query`, `mode` not `literal`/`regex`, non-boolean `caseSensitive`/`wholeWord`). Valid requests behave exactly as before.

- [ ] **Step 1: Replace the ad-hoc param coercion**

Replace the full contents of `apps/web/app/api/find/search/route.ts` with:

```ts
import type { NextRequest } from 'next/server'
import { searchRequestSchema } from '@/lib/find/search-schema'
import { executeSearch } from '@/lib/find/search-service'
import { formatIssues } from '@/lib/validation'

export async function GET(request: NextRequest) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return Response.json(
      { error: 'Cross-site requests are not allowed.' },
      { status: 403 },
    )
  }

  const parsed = searchRequestSchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  )

  if (!parsed.success) {
    return Response.json(
      { error: formatIssues(parsed.error), issues: parsed.error.issues },
      { status: 400 },
    )
  }

  try {
    return Response.json(
      await executeSearch(
        { ...parsed.data, maxResultsPerSource: 50 },
        request.signal,
      ),
    )
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Search failed unexpectedly.',
      },
      { status: 500 },
    )
  }
}
```

Note: `parsed.data` structurally satisfies `SearchOptions` (defined in `lib/find/search.ts`) minus the optional `maxResultsPerSource`, which the route adds. If TypeScript complains, do not cast — the schema output and `SearchOptions` should agree exactly; fix the mismatch instead.

- [ ] **Step 2: Verify**

Run: `pnpm --filter web typecheck && pnpm lint:fix && pnpm lint`
Expected: pass.

- [ ] **Step 3: Smoke-test the route with curl**

Run: `pnpm --filter web dev` in the background, wait for "Ready", then:

```bash
curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:3000/api/find/search'
curl -s 'http://localhost:3000/api/find/search?query=&mode=literal'
curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:3000/api/find/search?query=foo&mode=banana'
curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:3000/api/find/search?query=foo'
```

Expected, in order: `400`; a JSON body whose `error` contains `Missing query parameter.`; `400`; `200`. Stop the dev server after.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/find/search/route.ts
git commit -m "feat(find): validate search route params with zod"
```

---

### Task 3: Validate the search response in the client and derive types from schemas

**Files:**
- Modify: `apps/web/lib/find/search.ts:11-51` (type definitions only)
- Modify: `apps/web/lib/find/search-service.ts:13-19`
- Modify: `apps/web/lib/find/search-client.ts` (whole file below)

**Interfaces:**
- Consumes: `searchResponseSchema`, `SearchMatch`, `SearchMode`, `SearchResponse` from `@/lib/find/search-schema` (Task 1).
- Produces: `lib/find/search.ts` still exports `SearchMode`, `SearchMatch`, `SearchOptions` (same names, now schema-derived); `lib/find/search-service.ts` still exports `SearchResponse` and `executeSearch`; `lib/find/search-client.ts` still exports `fetchSearchResults` and `SearchResponse`. Consumers (`find-workspace.tsx`, `keys.ts`, the route) need no changes.

- [ ] **Step 1: Re-derive SearchMode and SearchMatch in `lib/find/search.ts`**

Delete the local definitions of `SearchMode` (line 11) and `SearchMatch` (lines 31–41), and re-export the schema-derived types instead. The top of the file becomes:

```ts
import { spawn } from 'node:child_process'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import {
  FIND_MIRROR_ROOT,
  type FindConfig,
  type GitHubRepoSource,
  type LocalRootSource,
} from './config'
import type { SearchMatch, SearchMode } from './search-schema'

export type { SearchMatch, SearchMode }

export type SearchOptions = {
  query: string
  mode: SearchMode
  caseSensitive: boolean
  wholeWord: boolean
  extension: string
  pathFilter: string
  sourceFilter: string
  maxResultsPerSource?: number
}

export type SearchSource = {
  id: string
  label: string
  rootPath: string
  kind: 'local' | 'github'
}
```

Leave `RgMatchEvent` and everything below unchanged (Task 4 handles it).

- [ ] **Step 2: Re-derive SearchResponse in `lib/find/search-service.ts`**

Replace the local `SearchResponse` type (lines 13–19) with a re-export. The top of the file becomes:

```ts
import {
  addRecentSearches,
  readFindConfig,
  updateFindConfig,
} from '@/lib/find/config'
import {
  getSearchSources,
  groupMatchesByProject,
  type SearchOptions,
  searchAcrossSources,
} from '@/lib/find/search'
import type { SearchResponse } from '@/lib/find/search-schema'

export type { SearchResponse }
```

`executeSearch` stays untouched; its returned objects already match the schema shape. If typecheck flags a mismatch between `ReturnType<typeof groupMatchesByProject>` and `searchResponseSchema`'s `groups`, the schema in Task 1 is wrong — fix the schema, not the code.

- [ ] **Step 3: Validate the response in `lib/find/search-client.ts`**

Replace the full contents with:

```ts
import type { SearchOptions } from '@/lib/find/search'
import {
  type SearchResponse,
  searchResponseSchema,
} from '@/lib/find/search-schema'

export type { SearchResponse }

export async function fetchSearchResults(
  options: SearchOptions,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    query: options.query,
    mode: options.mode,
    caseSensitive: String(options.caseSensitive),
    wholeWord: String(options.wholeWord),
    extension: options.extension,
    pathFilter: options.pathFilter,
    sourceFilter: options.sourceFilter,
  })

  const response = await fetch(`/api/find/search?${params.toString()}`, {
    signal,
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string
    } | null
    throw new Error(
      body?.error ?? `Search failed with status ${response.status}.`,
    )
  }

  const parsed = searchResponseSchema.safeParse(await response.json())

  if (!parsed.success) {
    throw new Error('Search response did not match the expected shape.')
  }

  return parsed.data
}
```

- [ ] **Step 4: Verify**

Run: `pnpm --filter web typecheck && pnpm lint:fix && pnpm lint`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/find/search.ts apps/web/lib/find/search-service.ts apps/web/lib/find/search-client.ts
git commit -m "feat(find): validate search responses and derive search types from schemas"
```

---

### Task 4: Validate ripgrep JSON events

**Files:**
- Modify: `apps/web/lib/find/search.ts:43-51` (the `RgMatchEvent` type) and `:126-133` (`parseJsonLine`)

**Interfaces:**
- Consumes: nothing new from other tasks.
- Produces: no exported surface changes — `parseJsonLine` stays private with signature `(line: string) => RgMatchEvent | null`.

- [ ] **Step 1: Replace the cast with a schema**

In `apps/web/lib/find/search.ts`, add `import { z } from 'zod'` to the imports, then replace the `RgMatchEvent` type definition:

```ts
const rgMatchEventSchema = z.object({
  type: z.literal('match'),
  data: z.object({
    path: z.object({ text: z.string() }),
    lines: z.object({ text: z.string() }),
    line_number: z.number(),
    submatches: z.array(z.object({ start: z.number(), end: z.number() })),
  }),
})

type RgMatchEvent = z.infer<typeof rgMatchEventSchema>
```

and replace `parseJsonLine`:

```ts
function parseJsonLine(line: string): RgMatchEvent | null {
  try {
    const result = rgMatchEventSchema.safeParse(JSON.parse(line))
    return result.success ? result.data : null
  } catch {
    return null
  }
}
```

Behavior note: rg emits `begin`/`end`/`summary` events and, for non-UTF-8 content, `bytes` instead of `text` fields. All of those now fail `safeParse` and are skipped — same skip path as today's `type !== 'match'` check, but covering the full shape.

- [ ] **Step 2: Verify**

Run: `pnpm --filter web typecheck && pnpm lint:fix && pnpm lint`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/find/search.ts
git commit -m "feat(find): validate ripgrep json events with zod"
```

---

### Task 5: Validate the disk config

**Files:**
- Modify: `apps/web/lib/find/config.ts:5-24` (types), `:33-78` (`normalizeConfig` — delete), `:84-99` (`readFindConfig`), `:110-121` (`updateFindConfig`)

**Interfaces:**
- Consumes: `formatIssues` from `@/lib/validation` (Task 1).
- Produces: same exported names as today — `FindConfig`, `GitHubRepoSource`, `LocalRootSource` (now schema-derived), `readFindConfig`, `writeFindConfig`, `updateFindConfig`, `createSourceId`, `normalizeLocalPath`, `addRecentSearches`, and the `FIND_*` path constants. New export: `findConfigSchema`. `normalizeConfig` is deleted (it was private).

- [ ] **Step 1: Replace types and normalizeConfig with a schema**

In `apps/web/lib/find/config.ts`, replace everything from the top of the file through the end of `normalizeConfig` (lines 1–78, which covers the imports, the hand-written types, the `FIND_*` constants, `MAX_RECENT_SEARCHES`, `updateQueue`, and `normalizeConfig`) with the block below. `ensureFindHome` and everything after it stays, except the two functions edited in Step 2.

```ts
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { z } from 'zod'
import { formatIssues } from '@/lib/validation'

const MAX_RECENT_SEARCHES = 8

const gitHubRepoSourceSchema = z.object({
  id: z.string(),
  owner: z.string(),
  repo: z.string(),
  selectedAt: z.string(),
  syncError: z.string().nullable(),
  syncedAt: z.string().nullable(),
})

const localRootSourceSchema = z.object({
  id: z.string(),
  path: z.string(),
  addedAt: z.string(),
})

export const findConfigSchema = z.object({
  localRoots: z.array(localRootSourceSchema),
  githubRepos: z.array(gitHubRepoSourceSchema),
  recentSearches: z
    .array(z.string())
    .transform((items) => items.slice(0, MAX_RECENT_SEARCHES)),
})

export type FindConfig = z.infer<typeof findConfigSchema>
export type GitHubRepoSource = z.infer<typeof gitHubRepoSourceSchema>
export type LocalRootSource = z.infer<typeof localRootSourceSchema>

export const FIND_HOME = path.join(os.homedir(), '.crispy-code')
export const FIND_CONFIG_PATH = path.join(FIND_HOME, 'config.json')
export const FIND_MIRROR_ROOT = path.join(FIND_HOME, 'repos')

let updateQueue: Promise<unknown> = Promise.resolve()

function emptyFindConfig(): FindConfig {
  return { localRoots: [], githubRepos: [], recentSearches: [] }
}
```

(Keep the existing `MAX_RECENT_SEARCHES` usage in `addRecentSearches` — the constant just moves up.)

- [ ] **Step 2: Rework readFindConfig and updateFindConfig**

Replace `readFindConfig` (lines 84–99) with:

```ts
export async function readFindConfig(): Promise<FindConfig> {
  let raw: string

  try {
    raw = await readFile(FIND_CONFIG_PATH, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return emptyFindConfig()
    }

    throw error
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  } catch {
    console.warn(
      `Ignoring unparseable find config at ${FIND_CONFIG_PATH}; using defaults.`,
    )
    return emptyFindConfig()
  }

  const result = findConfigSchema.safeParse(parsed)

  if (!result.success) {
    console.warn(
      `Ignoring invalid find config at ${FIND_CONFIG_PATH}: ${formatIssues(result.error)}`,
    )
    return emptyFindConfig()
  }

  return result.data
}
```

In `updateFindConfig`, replace the line `const next = normalizeConfig(update(current))` with:

```ts
    const next = findConfigSchema.parse(update(current))
```

(`update` results come from our own code, so a hard `parse` is correct — a failure there is a bug, not bad input.)

Behavior note (intentional, per spec): a config file with invalid *items* previously had those items filtered out; now the whole file falls back to defaults with a warning. Corrupted JSON previously threw; now it warns and uses defaults.

- [ ] **Step 3: Verify**

Run: `pnpm --filter web typecheck && pnpm lint:fix && pnpm lint`
Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/find/config.ts
git commit -m "feat(find): validate disk config with zod schema"
```

---

### Task 6: Validate GitHub API responses

**Files:**
- Create: `apps/web/lib/github/schemas.ts`
- Modify: `apps/web/lib/github/types.ts` (whole file below)
- Modify: `apps/web/lib/github/client.ts:26-39` (`fetchGitHub` signature and ok-branch)
- Modify: `apps/web/lib/github/commits.ts:22,42-44,63-65` (pass schemas)
- Modify: `apps/web/app/find/actions.ts:17-23,115-117,119-121,148-150` (lookup item schema)

**Interfaces:**
- Consumes: `formatIssues` from `@/lib/validation` (Task 1).
- Produces:
  - `fetchGitHub<T>(path: string, schema: z.ZodType<T>): Promise<GitHubResult<T>>` — **signature change**; all callers updated in this task.
  - From `@/lib/github/schemas`: `gitHubRepoSchema`, `gitHubCommitSummarySchema`, `gitHubCommitListSchema`, `gitHubCommitFileSchema`, `gitHubCommitDetailSchema`, `gitHubRepoLookupItemSchema`, `gitHubRepoLookupListSchema`.
  - `@/lib/github/types` keeps exporting `GitHubRepo`, `GitHubCommitSummary`, `GitHubCommitFileStatus`, `GitHubCommitFile`, `GitHubCommitDetail` (now inferred) plus new `GitHubRepoLookupItem`. Consumers (`commit-list.tsx`, `file-diff.tsx`) need no changes.

- [ ] **Step 1: Create the schemas**

Create `apps/web/lib/github/schemas.ts`:

```ts
import { z } from 'zod'

export const gitHubRepoSchema = z.object({
  default_branch: z.string(),
  description: z.string().nullable(),
  full_name: z.string(),
  html_url: z.string(),
  stargazers_count: z.number(),
})

export const gitHubCommitSummarySchema = z.object({
  author: z.object({ avatar_url: z.string(), login: z.string() }).nullable(),
  commit: z.object({
    author: z.object({ date: z.string(), name: z.string() }).nullable(),
    message: z.string(),
  }),
  html_url: z.string(),
  sha: z.string(),
})

export const gitHubCommitListSchema = z.array(gitHubCommitSummarySchema)

export const gitHubCommitFileSchema = z.object({
  additions: z.number(),
  deletions: z.number(),
  filename: z.string(),
  /** Absent for binary files and for diffs GitHub considers too large. */
  patch: z.string().optional(),
  previous_filename: z.string().optional(),
  status: z.enum([
    'added',
    'changed',
    'copied',
    'modified',
    'removed',
    'renamed',
    'unchanged',
  ]),
})

export const gitHubCommitDetailSchema = gitHubCommitSummarySchema.extend({
  files: z.array(gitHubCommitFileSchema).optional(),
  stats: z
    .object({
      additions: z.number(),
      deletions: z.number(),
      total: z.number(),
    })
    .optional(),
})

export const gitHubRepoLookupItemSchema = z.object({
  full_name: z.string(),
  name: z.string(),
  owner: z.object({ login: z.string() }),
})

export const gitHubRepoLookupListSchema = z.array(gitHubRepoLookupItemSchema)
```

- [ ] **Step 2: Derive the types**

Replace the full contents of `apps/web/lib/github/types.ts` with:

```ts
import type { z } from 'zod'
import type {
  gitHubCommitDetailSchema,
  gitHubCommitFileSchema,
  gitHubCommitSummarySchema,
  gitHubRepoLookupItemSchema,
  gitHubRepoSchema,
} from './schemas'

export type GitHubRepo = z.infer<typeof gitHubRepoSchema>
export type GitHubCommitSummary = z.infer<typeof gitHubCommitSummarySchema>
export type GitHubCommitFile = z.infer<typeof gitHubCommitFileSchema>
export type GitHubCommitFileStatus = GitHubCommitFile['status']
export type GitHubCommitDetail = z.infer<typeof gitHubCommitDetailSchema>
export type GitHubRepoLookupItem = z.infer<typeof gitHubRepoLookupItemSchema>
```

- [ ] **Step 3: Make fetchGitHub take a schema**

In `apps/web/lib/github/client.ts`, add imports:

```ts
import type { z } from 'zod'
import { formatIssues } from '@/lib/validation'
```

Change the signature (line 26) and the ok-branch (lines 38–40):

```ts
export async function fetchGitHub<T>(
  path: string,
  schema: z.ZodType<T>,
): Promise<GitHubResult<T>> {
```

```ts
    if (response.ok) {
      const parsed = schema.safeParse(await response.json())

      if (!parsed.success) {
        return {
          status: 'error',
          message: `GitHub response for ${path} failed validation: ${formatIssues(parsed.error)}`,
        }
      }

      return { status: 'ok', data: parsed.data }
    }
```

Everything else in the file (rate-limit, 404/422, catch) stays as-is, preserving the never-throws contract.

- [ ] **Step 4: Update commits.ts callsites**

In `apps/web/lib/github/commits.ts`, add to imports:

```ts
import {
  gitHubCommitDetailSchema,
  gitHubCommitListSchema,
  gitHubRepoSchema,
} from './schemas'
```

Then drop the explicit generics and pass schemas — the three `fetchGitHub` calls become:

```ts
  // in getRepo
  const result = await fetchGitHub(repoPath(owner, repo), gitHubRepoSchema)

  // in getCommits
  const result = await fetchGitHub(
    `${repoPath(owner, repo)}/commits?per_page=${COMMITS_PER_PAGE}&page=${page}`,
    gitHubCommitListSchema,
  )

  // in getCommit
  const result = await fetchGitHub(
    `${repoPath(owner, repo)}/commits/${encodeURIComponent(sha)}`,
    gitHubCommitDetailSchema,
  )
```

The declared return types (`GitHubResult<GitHubRepo>` etc.) stay — the inferred types match them.

- [ ] **Step 5: Update the repo lookup in find actions**

In `apps/web/app/find/actions.ts`:
- Delete the local `GitHubRepoLookupItem` type (lines 17–23).
- Add imports: `import { gitHubRepoLookupListSchema } from '@/lib/github/schemas'` and `import type { GitHubRepoLookupItem } from '@/lib/github/types'`.
- Change both lookup calls to pass the schema and drop the generic:

```ts
  const userResult = await fetchGitHub(
    `/users/${encodeURIComponent(target)}/repos?per_page=100&sort=updated`,
    gitHubRepoLookupListSchema,
  )
```

```ts
  const orgResult = await fetchGitHub(
    `/orgs/${encodeURIComponent(target)}/repos?per_page=100&sort=updated`,
    gitHubRepoLookupListSchema,
  )
```

`mapRepos` keeps its `(items: GitHubRepoLookupItem[])` parameter type.

- [ ] **Step 6: Verify**

Run: `pnpm --filter web typecheck && pnpm lint:fix && pnpm lint`
Expected: pass. Then a live check — start `pnpm --filter web dev`, open `http://localhost:3000/git/vercel/next.js`, confirm the commit list renders (proves the summary schema matches real GitHub data); open one commit (proves the detail schema). Stop the server.

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/github/schemas.ts apps/web/lib/github/types.ts apps/web/lib/github/client.ts apps/web/lib/github/commits.ts apps/web/app/find/actions.ts
git commit -m "feat(github): validate api responses with zod schemas"
```

---

### Task 7: Validate server action inputs

**Files:**
- Modify: `apps/web/app/git/actions.ts` (whole file below)
- Modify: `apps/web/app/find/actions.ts:62-69` (`addLocalRoot`), `:99-104` (`removeLocalRoot`), `:106-113` (`lookupGitHubRepos`), `:176-180` (`setGitHubRepoSelection`)

**Interfaces:**
- Consumes: zod only. Action signatures and return shapes are unchanged, so no component changes.
- Produces: same exports as today from both action files.

- [ ] **Step 1: connectRepo**

Replace the full contents of `apps/web/app/git/actions.ts` with:

```ts
'use server'

import type { Route } from 'next'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { parseRepoInput } from '@/lib/github/parse-repo-input'

export type ConnectRepoState = { error?: string }

const connectRepoFields = z.object({
  repo: z.string(),
})

export async function connectRepo(
  _state: ConnectRepoState,
  formData: FormData,
): Promise<ConnectRepoState> {
  const fields = connectRepoFields.safeParse({
    repo: formData.get('repo'),
  })

  if (!fields.success) {
    return { error: 'Enter a repository.' }
  }

  const parsed = parseRepoInput(fields.data.repo)

  if (!parsed.ok) {
    return { error: parsed.error }
  }

  redirect(`/git/${parsed.owner}/${parsed.repo}` as Route)
}
```

(The schema rejects a missing field or a `File`; `parseRepoInput` still owns the empty-string and format messages, so user-facing copy is unchanged.)

- [ ] **Step 2: find actions**

In `apps/web/app/find/actions.ts`, add `import { z } from 'zod'` and these schemas near the other module-level declarations:

```ts
const addLocalRootFields = z.object({
  localPath: z.string().trim().min(1),
})

const sourceIdSchema = z.string().min(1)

const repoSelectionSchema = z.object({
  repo: z.object({
    id: z.string().min(1),
    owner: z.string().min(1),
    repo: z.string().min(1),
  }),
  selected: z.boolean(),
})

const ownerOrOrgSchema = z.string().trim().min(1)
```

Then update each action:

`addLocalRoot` — replace lines 65–69 (`const rawPath = ...` through the empty check) with:

```ts
  const fields = addLocalRootFields.safeParse({
    localPath: formData.get('localPath'),
  })

  if (!fields.success) {
    return { error: 'Enter a local project folder.' }
  }
```

and use `fields.data.localPath` where `rawPath` was used (`const normalized = normalizeLocalPath(fields.data.localPath)`).

`removeLocalRoot` — validate at the top (invalid means a bug or tampering, so throwing is correct for a void action):

```ts
export async function removeLocalRoot(id: string): Promise<void> {
  const parsedId = sourceIdSchema.parse(id)

  await updateFindConfig((current) => ({
    ...current,
    localRoots: current.localRoots.filter((item) => item.id !== parsedId),
  }))
}
```

`lookupGitHubRepos` — replace lines 109–113 (`const target = ...` through the empty check) with:

```ts
  const parsedTarget = ownerOrOrgSchema.safeParse(ownerOrOrg)

  if (!parsedTarget.success) {
    return { status: 'error', message: 'Enter a GitHub username or org.' }
  }

  const target = parsedTarget.data
```

`setGitHubRepoSelection` — parse both arguments at the top and use the parsed values in the body:

```ts
export async function setGitHubRepoSelection(
  repoInput: Pick<GitHubRepoSource, 'owner' | 'repo' | 'id'>,
  selectedInput: boolean,
): Promise<void> {
  const { repo, selected } = repoSelectionSchema.parse({
    repo: repoInput,
    selected: selectedInput,
  })
```

The function body below (the `updateFindConfig` callback) already references `repo` and `selected`, so it needs no changes.

- [ ] **Step 3: Verify**

Run: `pnpm --filter web typecheck && pnpm lint:fix && pnpm lint`
Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/git/actions.ts apps/web/app/find/actions.ts
git commit -m "feat: validate server action inputs with zod"
```

---

### Task 8: Validate page params and searchParams

**Files:**
- Modify: `apps/web/components/git/commit-list.tsx:20-25`
- Modify: `apps/web/app/git/[owner]/[repo]/commit/[sha]/page.tsx:18-22`
- Modify: `apps/web/app/find/file/page.tsx:47-60` and the `line`-dependent expressions below

**Interfaces:**
- Consumes: zod only.
- Produces: no exported surface changes; behavior for invalid values matches today (default page 1, `notFound()` for bad sha/path).

- [ ] **Step 1: Page number in commit-list**

In `apps/web/components/git/commit-list.tsx`, add `import { z } from 'zod'` and replace `toPageNumber` (lines 20–25) with:

```ts
const pageSchema = z.coerce.number().int().positive().catch(1)

function toPageNumber(value: string | string[] | undefined): number {
  return pageSchema.parse(Array.isArray(value) ? value[0] : value)
}
```

(`z.coerce.number()` runs `Number(input)`; `undefined`, `''`, `'abc'`, `'2.5'`, and `'-1'` all fail the checks and hit `.catch(1)` — identical to today's fallback.)

- [ ] **Step 2: Commit page params**

In `apps/web/app/git/[owner]/[repo]/commit/[sha]/page.tsx`, add `import { z } from 'zod'` and a module-level schema:

```ts
const commitParamsSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  sha: z.string().regex(/^[0-9a-f]{4,40}$/i),
})
```

Replace the destructure (line 21) with:

```ts
  const parsedParams = commitParamsSchema.safeParse(await params)

  if (!parsedParams.success) {
    notFound()
  }

  const { owner, repo, sha } = parsedParams.data
```

(Today a garbage sha round-trips to GitHub, gets a 422, and renders `notFound()` — same outcome, now without the API call. All in-app links use full 40-char shas; 4–40 hex chars also allows hand-typed abbreviated shas, which GitHub accepts.)

- [ ] **Step 3: Find file page searchParams**

In `apps/web/app/find/file/page.tsx`, add `import { z } from 'zod'` and a module-level schema:

```ts
const fileParamsSchema = z.object({
  path: z.string().min(1),
  line: z.coerce.number().int().positive().catch(0),
})
```

Replace lines 52–58 (`const params = await searchParams` through the `typeof inputPath` check) with:

```ts
  const parsed = fileParamsSchema.safeParse(await searchParams)

  if (!parsed.success) {
    notFound()
  }

  const { path: inputPath, line } = parsed.data
```

`line` is now always a finite number (0 means "no line requested"), so simplify the three `Number.isFinite(line)` guards:

```ts
  const focusStart = line > 3 ? line - 3 : 1
  const focusEnd = line > 0 ? Math.min(line + 3, lines.length) : 0
```

and in the JSX header:

```tsx
          {line > 0 ? `:${line}` : ''}
```

`focusSlice` already keys off `line > 0` — leave it. The `assertKnownSource` path-allowlist check stays exactly where it is, after `normalizeFilePath`.

- [ ] **Step 4: Verify**

Run: `pnpm --filter web typecheck && pnpm lint:fix && pnpm lint`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/git/commit-list.tsx 'apps/web/app/git/[owner]/[repo]/commit/[sha]/page.tsx' apps/web/app/find/file/page.tsx
git commit -m "feat: validate page params and search params with zod"
```

---

### Task 9: Validate environment variables

**Files:**
- Create: `apps/web/lib/env.ts`
- Modify: `apps/web/lib/github/client.ts:27` (token read)
- Modify: `apps/web/app/find/file/page.tsx:26-34` (HOME read)

**Interfaces:**
- Consumes: nothing from other tasks (client.ts already has the Task 6 shape).
- Produces: `env: { GITHUB_TOKEN: string | undefined; HOME: string }` from `@/lib/env`, parsed once at module load. Server-only — never import it from a client component.

- [ ] **Step 1: Create the env module**

Create `apps/web/lib/env.ts`:

```ts
import { z } from 'zod'

const optionalToken = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim()
    return trimmed?.length ? trimmed : undefined
  })

const envSchema = z.object({
  GITHUB_TOKEN: optionalToken,
  HOME: z.string().min(1),
})

export const env = envSchema.parse({
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  HOME: process.env.HOME,
})
```

(An empty or whitespace `GITHUB_TOKEN` becomes `undefined` — today's falsy check treats it the same way. A missing `HOME` fails at startup with a clear zod error instead of silently building broken repo paths.)

- [ ] **Step 2: Use it in the GitHub client**

In `apps/web/lib/github/client.ts`, add `import { env } from '@/lib/env'` and replace line 27:

```ts
  const token = env.GITHUB_TOKEN
```

- [ ] **Step 3: Use it in the find file page**

In `apps/web/app/find/file/page.tsx`, add `import { env } from '@/lib/env'` and in `assertKnownSource` replace `process.env.HOME ?? ''` with `env.HOME`:

```ts
  const repoRoots = config.githubRepos.map((item) =>
    path.join(env.HOME, '.crispy-code', 'repos', item.owner, item.repo),
  )
```

- [ ] **Step 4: Verify**

Run: `pnpm --filter web typecheck && pnpm lint:fix && pnpm lint`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/env.ts apps/web/lib/github/client.ts apps/web/app/find/file/page.tsx
git commit -m "feat: validate environment variables with zod"
```

---

### Task 10: End-to-end verification

**Files:** none created or modified (fixes go in the task that owns the file, then re-run this checklist).

**Interfaces:** n/a.

- [ ] **Step 1: Full static checks**

Run from the repo root:

```bash
pnpm typecheck && pnpm lint && pnpm build
```

Expected: all pass.

- [ ] **Step 2: Search route checks**

Start `pnpm --filter web dev`, wait for "Ready", then:

```bash
curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:3000/api/find/search'          # expect 400
curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:3000/api/find/search?query=foo&mode=banana'  # expect 400
curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:3000/api/find/search?query=foo'              # expect 200
```

- [ ] **Step 3: Git flow in the browser**

1. `http://localhost:3000/git` — connect `vercel/next.js`, commit list renders.
2. `?page=abc` on the repo page — renders page 1, no crash.
3. Open a commit — detail and diffs render (stats, files).
4. `http://localhost:3000/git/vercel/next.js/commit/nothex!` — 404 page.

- [ ] **Step 4: Find flow in the browser**

1. `http://localhost:3000/find` — add a local root, run a literal and a regex search, results render, recent searches update.
2. Click a result — file view opens at the right line.
3. Tamper with the URL: `/find/file?path=/etc/passwd` — 404. `/find/file?path=<valid>&line=abc` — file renders with no line focus.

- [ ] **Step 5: Config resilience**

```bash
cp ~/.crispy-code/config.json /tmp/crispy-config-backup.json
echo 'not json' > ~/.crispy-code/config.json
```

Reload `/find` — expect the empty-config state and a `Ignoring unparseable find config` warning in the dev server logs, no crash. Then restore:

```bash
cp /tmp/crispy-config-backup.json ~/.crispy-code/config.json
```

Reload `/find` — sources are back.

- [ ] **Step 6: Token-less GitHub**

Confirm `apps/web/.env.local` has no `GITHUB_TOKEN` (or comment it out), restart the dev server, and load a repo page — unauthenticated requests still work. Restore the token after.

- [ ] **Step 7: Done**

Stop the dev server. If any check failed, fix it in the owning task's files, commit there, and re-run this checklist.
