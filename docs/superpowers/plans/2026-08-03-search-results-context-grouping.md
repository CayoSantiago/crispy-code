# Search Results Context & File Grouping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show ripgrep ±2 context in Find results, group lines under one file header per file, and render an editor-gutter layout with line numbers.

**Architecture:** Extend the ripgrep JSON parser to keep `match` and `context` events, then pure-transform those line events into nested `SearchGroup → SearchFile → SearchCluster → SearchLine`. The UI truncates by match budget (10) and renders file headers + gutter rows with dashed gaps between clusters.

**Tech Stack:** Next.js App Router, oRPC + TanStack Query, zod 4, ripgrep `--json --context 2`, Biome, pnpm + Turborepo.

**Spec:** `docs/superpowers/specs/2026-08-03-search-results-context-grouping-design.md`

## Global Constraints

- Fixed context size: `rg --context 2` only. Do not add a UI control for context size.
- Truncation is by **match** count (10 per project in the UI). Context lines never count toward the budget or `totalMatches`.
- Cluster boundaries: same file + non-contiguous line numbers (`lineNumber > lastLineNumber + 1`) start a new cluster. Contiguous/overlapping context stays one cluster.
- Visual layout: editor gutter (right-aligned line numbers, muted context, light wash on match rows, dashed divider between clusters).
- No new unit test framework. Verify with `pnpm --filter web check-types`, `pnpm lint:fix`, `pnpm lint`, plus manual smoke from the spec.
- Code style: Biome — single quotes, no semicolons. Run `pnpm lint:fix` before each commit.
- Stay inside the Find search/results surface; do not change search chrome/filters or project grouping rules.
- Follow Next.js guidance in `node_modules/next/dist/docs/` if route/server boundaries change.

## File structure

| File | Responsibility |
|---|---|
| `apps/web/features/find/schemas.ts` | Nested search response schemas (`files` / `clusters` / `lines`) |
| `apps/web/features/find/cluster-search-lines.ts` | Pure clustering + match-budget truncation helpers |
| `apps/web/features/find/search.ts` | Parse `match` + `context` rg events; build line events; group into response groups |
| `apps/web/features/find/service.ts` | Wire `executeSearch` to the new grouping helpers |
| `apps/web/components/find/search-results.tsx` | Editor-gutter UI: file headers, clusters, line numbers, truncation |

---

### Task 1: Nested search response schemas

**Files:**
- Modify: `apps/web/features/find/schemas.ts`

**Interfaces:**
- Consumes: existing zod / RPC input schemas (unchanged).
- Produces:
  - `searchLineSchema` / `SearchLine`
  - `searchClusterSchema` / `SearchCluster`
  - `searchFileSchema` / `SearchFile`
  - `searchGroupSchema` / `SearchGroup` with `files` + `matchCount` (no `matches`)
  - `searchResponseSchema` / `SearchResponse` unchanged at top level (`groups`, `totalMatches`, `missingSources`)
  - Remove exported `SearchMatch` / `searchMatchSchema` (replaced by nested types)

- [ ] **Step 1: Replace match/group schemas**

In `apps/web/features/find/schemas.ts`, keep `searchModeSchema`, `searchRpcInputSchema`, and GitHub/sync schemas. Replace the match/group/response section and types with:

```ts
export const searchLineSchema = z.object({
  lineNumber: z.number(),
  lineText: z.string(),
  kind: z.enum(['match', 'context']),
  matchRanges: z.array(z.object({ start: z.number(), end: z.number() })).optional(),
})

export const searchClusterSchema = z.object({
  lines: z.array(searchLineSchema),
})

export const searchFileSchema = z.object({
  relativePath: z.string(),
  absolutePath: z.string(),
  matchCount: z.number(),
  clusters: z.array(searchClusterSchema),
})

const sourceRefSchema = z.object({ id: z.string(), label: z.string() })

export const searchGroupSchema = z.object({
  sourceId: z.string(),
  sourceLabel: z.string(),
  projectName: z.string(),
  sourceKind: z.enum(['local', 'github']),
  files: z.array(searchFileSchema),
  matchCount: z.number(),
})

export const searchResponseSchema = z.object({
  groups: z.array(searchGroupSchema),
  totalMatches: z.number(),
  missingSources: z.array(sourceRefSchema),
})

export type SearchMode = z.infer<typeof searchModeSchema>
export type SearchRpcInput = z.infer<typeof searchRpcInputSchema>
export type SearchLine = z.infer<typeof searchLineSchema>
export type SearchCluster = z.infer<typeof searchClusterSchema>
export type SearchFile = z.infer<typeof searchFileSchema>
export type SearchGroup = z.infer<typeof searchGroupSchema>
export type SearchResponse = z.infer<typeof searchResponseSchema>
export type GitHubRepoPick = z.infer<typeof gitHubRepoPickSchema>
export type SyncGitHubReposInput = z.infer<typeof syncGitHubReposInputSchema>
export type SyncResult = z.infer<typeof syncResultSchema>
```

Delete `searchMatchSchema` and `SearchMatch`.

- [ ] **Step 2: Typecheck (expect failures in consumers)**

Run:

```bash
pnpm --filter web check-types
```

Expected: FAIL on `search.ts`, `service.ts`, and/or `search-results.tsx` referencing `SearchMatch` / `group.matches`. That is intentional; later tasks fix them.

- [ ] **Step 3: Commit**

```bash
git add apps/web/features/find/schemas.ts
git commit -m "$(cat <<'EOF'
refactor(find): nest search results as files, clusters, and lines

EOF
)"
```

---

### Task 2: Pure clustering and truncation helpers

**Files:**
- Create: `apps/web/features/find/cluster-search-lines.ts`

**Interfaces:**
- Consumes: `SearchFile`, `SearchGroup`, `SearchLine` types from `@/features/find/schemas`
- Produces:
  - `SearchLineEvent` type (line + source/project identity)
  - `buildSearchGroups(events: SearchLineEvent[]): SearchGroup[]`
  - `truncateFilesByMatchBudget(files: SearchFile[], maxMatches: number): SearchFile[]`

- [ ] **Step 1: Create `cluster-search-lines.ts`**

Create `apps/web/features/find/cluster-search-lines.ts`:

```ts
import type { SearchFile, SearchGroup, SearchLine } from '@/features/find/schemas'

export type SearchLineEvent = {
  sourceId: string
  sourceLabel: string
  sourceKind: 'local' | 'github'
  projectName: string
  absolutePath: string
  relativePath: string
  lineNumber: number
  lineText: string
  kind: 'match' | 'context'
  matchRanges: Array<{ start: number; end: number }>
}

function toSearchLine(event: SearchLineEvent): SearchLine {
  if (event.kind === 'match') {
    return {
      lineNumber: event.lineNumber,
      lineText: event.lineText,
      kind: 'match',
      matchRanges: event.matchRanges,
    }
  }

  return {
    lineNumber: event.lineNumber,
    lineText: event.lineText,
    kind: 'context',
  }
}

function buildFilesForEvents(events: SearchLineEvent[]): SearchFile[] {
  const files: SearchFile[] = []
  let currentFile: SearchFile | null = null
  let lastLineNumber = -1

  for (const event of events) {
    const needsNewFile =
      !currentFile || currentFile.absolutePath !== event.absolutePath

    if (needsNewFile) {
      currentFile = {
        relativePath: event.relativePath,
        absolutePath: event.absolutePath,
        matchCount: 0,
        clusters: [{ lines: [] }],
      }
      files.push(currentFile)
      lastLineNumber = -1
    }

    const needsNewCluster =
      lastLineNumber >= 0 && event.lineNumber > lastLineNumber + 1

    if (needsNewCluster) {
      currentFile.clusters.push({ lines: [] })
    }

    const cluster = currentFile.clusters[currentFile.clusters.length - 1]
    cluster.lines.push(toSearchLine(event))
    lastLineNumber = event.lineNumber

    if (event.kind === 'match') {
      currentFile.matchCount += 1
    }
  }

  return files
}

export function buildSearchGroups(events: SearchLineEvent[]): SearchGroup[] {
  const grouped = new Map<string, SearchLineEvent[]>()

  for (const event of events) {
    const key = `${event.sourceId}:${event.projectName}`
    const current = grouped.get(key)

    if (current) {
      current.push(event)
      continue
    }

    grouped.set(key, [event])
  }

  const groups: SearchGroup[] = []

  for (const projectEvents of grouped.values()) {
    const first = projectEvents[0]
    const files = buildFilesForEvents(projectEvents)
    const matchCount = files.reduce((sum, file) => sum + file.matchCount, 0)

    groups.push({
      sourceId: first.sourceId,
      sourceLabel: first.sourceLabel,
      projectName: first.projectName,
      sourceKind: first.sourceKind,
      files,
      matchCount,
    })
  }

  return groups.sort((left, right) =>
    `${left.sourceLabel}/${left.projectName}`.localeCompare(
      `${right.sourceLabel}/${right.projectName}`,
    ),
  )
}

export function truncateFilesByMatchBudget(
  files: SearchFile[],
  maxMatches: number,
): SearchFile[] {
  if (maxMatches <= 0) {
    return []
  }

  const result: SearchFile[] = []
  let remaining = maxMatches

  for (const file of files) {
    if (remaining <= 0) {
      break
    }

    const clusters = []
    let fileMatchCount = 0

    for (const cluster of file.clusters) {
      const clusterMatchCount = cluster.lines.filter(
        (line) => line.kind === 'match',
      ).length

      if (clusterMatchCount === 0) {
        continue
      }

      if (clusterMatchCount > remaining) {
        remaining = 0
        break
      }

      clusters.push(cluster)
      fileMatchCount += clusterMatchCount
      remaining -= clusterMatchCount
    }

    if (clusters.length > 0) {
      result.push({
        relativePath: file.relativePath,
        absolutePath: file.absolutePath,
        matchCount: fileMatchCount,
        clusters,
      })
    }
  }

  return result
}
```

Behavioral notes locked by this code:

- New cluster when `lineNumber > lastLineNumber + 1` in the same file.
- New file whenever `absolutePath` changes.
- Truncation keeps whole clusters only; a cluster that does not fit the remaining match budget is skipped and truncation stops.
- Context-only clusters (no matches) are dropped during truncation.

- [ ] **Step 2: Typecheck the new module**

Run:

```bash
pnpm --filter web check-types
```

Expected: `cluster-search-lines.ts` itself typechecks. Existing failures in `search.ts` / UI may remain until Task 3–4.

- [ ] **Step 3: Commit**

```bash
git add apps/web/features/find/cluster-search-lines.ts
git commit -m "$(cat <<'EOF'
feat(find): add search line clustering and match-budget truncation

EOF
)"
```

---

### Task 3: Parse context events and wire search service

**Files:**
- Modify: `apps/web/features/find/search.ts`
- Modify: `apps/web/features/find/service.ts`

**Interfaces:**
- Consumes: `buildSearchGroups` from `@/features/find/cluster-search-lines`; nested schemas from `@/features/find/schemas`
- Produces:
  - `searchAcrossSources(...): Promise<SearchLineEvent[]>`
  - `runRipgrep` internally accumulates `SearchLineEvent` for both `match` and `context`
  - `executeSearch` returns `SearchResponse` with nested `files` / `matchCount`
  - Remove `groupMatchesByProject` and `SearchMatch` usage from these files

- [ ] **Step 1: Update ripgrep event parsing in `search.ts`**

Replace the match-only schema and imports at the top of `apps/web/features/find/search.ts` with:

```ts
import { spawn } from 'node:child_process'
import path from 'node:path'
import { z } from 'zod'
import type {
  FindConfig,
  GitHubRepoSource,
  LocalRootSource,
} from '@/features/find/config/schemas'
import { pathExists } from '@/lib/fs'
import type { SearchLineEvent } from './cluster-search-lines'
import { FIND_MIRROR_ROOT } from './config/data'
import type { SearchMode } from './schemas'

export type { SearchMode }

export type SearchOptions = {
  query: string
  mode: SearchMode
  caseSensitive: boolean
  pathGlob: string
  maxResultsPerSource?: number
}

export type SearchSource = {
  id: string
  label: string
  rootPath: string
  kind: 'local' | 'github'
}

const rgDataSchema = z.object({
  path: z.object({ text: z.string() }),
  lines: z.object({ text: z.string() }),
  line_number: z.number(),
  submatches: z
    .array(z.object({ start: z.number(), end: z.number() }))
    .optional()
    .default([]),
})

const rgLineEventSchema = z.object({
  type: z.enum(['match', 'context']),
  data: rgDataSchema,
})

type RgLineEvent = z.infer<typeof rgLineEventSchema>
```

Keep `sourceFromLocal`, `sourceFromGitHub`, `getSearchSources`, and `projectNameFor` as they are today.

Replace `parseJsonLine` with:

```ts
function parseJsonLine(line: string): RgLineEvent | null {
  try {
    const result = rgLineEventSchema.safeParse(JSON.parse(line))
    return result.success ? result.data : null
  } catch {
    return null
  }
}
```

- [ ] **Step 2: Change `runRipgrep` / `searchAcrossSources` to emit line events**

Update `runRipgrep` return type to `Promise<SearchLineEvent[]>`, initialize `const results: SearchLineEvent[] = []`, and replace the push body with:

```ts
const relativePath = event.data.path.text
const normalizedRelative = relativePath.split('/').join(path.sep)
const kind = event.type === 'match' ? 'match' : 'context'

results.push({
  sourceId: source.id,
  sourceLabel: source.label,
  sourceKind: source.kind,
  absolutePath: path.join(source.rootPath, normalizedRelative),
  relativePath: normalizedRelative,
  lineNumber: event.data.line_number,
  lineText: event.data.lines.text.replace(/\n$/, ''),
  kind,
  matchRanges:
    kind === 'match'
      ? event.data.submatches.map((submatch) => ({
          start: submatch.start,
          end: submatch.end,
        }))
      : [],
  projectName: projectNameFor(source, normalizedRelative),
})
```

Keep `--context` / `String(2)` and all other rg args unchanged.

Update `searchAcrossSources` to:

```ts
export async function searchAcrossSources(
  sources: SearchSource[],
  options: SearchOptions,
  signal?: AbortSignal,
): Promise<SearchLineEvent[]> {
  const query = options.query.trim()

  if (!query) {
    return []
  }

  const all = await Promise.all(
    sources.map((source) => runRipgrep(source, options, signal)),
  )

  return all
    .flat()
    .sort((left, right) => left.sourceLabel.localeCompare(right.sourceLabel))
}
```

Delete `groupMatchesByProject` entirely from this file. Delete any remaining `SearchMatch` imports/exports.

- [ ] **Step 3: Update `executeSearch` in `service.ts`**

Replace `apps/web/features/find/service.ts` with:

```ts
import { readFindConfig } from '@/features/find/config/service'
import { buildSearchGroups } from '@/features/find/cluster-search-lines'
import type { SearchResponse } from '@/features/find/schemas'
import {
  getSearchSources,
  type SearchOptions,
  searchAcrossSources,
} from '@/features/find/search'

export type { SearchResponse }

export async function executeSearch(
  options: SearchOptions,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const config = await readFindConfig()
  const sourceSet = await getSearchSources(config)
  const events = await searchAcrossSources(
    sourceSet.available,
    options,
    signal,
  )
  const groups = buildSearchGroups(events)
  const totalMatches = groups.reduce((sum, group) => sum + group.matchCount, 0)

  return {
    groups,
    totalMatches,
    missingSources: sourceSet.missing.map((source) => ({
      id: source.id,
      label: source.label,
    })),
  }
}
```

- [ ] **Step 4: Typecheck**

Run:

```bash
pnpm lint:fix
pnpm --filter web check-types
```

Expected: FAIL only in `search-results.tsx` (still using `group.matches`). `search.ts` and `service.ts` should be clean.

- [ ] **Step 5: Commit**

```bash
git add apps/web/features/find/search.ts apps/web/features/find/service.ts
git commit -m "$(cat <<'EOF'
feat(find): parse ripgrep context lines into clustered search groups

EOF
)"
```

---

### Task 4: Editor-gutter search results UI

**Files:**
- Modify: `apps/web/components/find/search-results.tsx`

**Interfaces:**
- Consumes:
  - `SearchResponse` with `group.files` / `group.matchCount`
  - `truncateFilesByMatchBudget(files, 10)` from `@/features/find/cluster-search-lines`
- Produces: updated `SearchResults` UI per spec (file header once, gutter line numbers, cluster gaps, match wash, muted context)

- [ ] **Step 1: Update imports and add helpers at the bottom of the file**

Keep existing imports that are still needed (`Link`, icons, `CopyButton`, etc.). Add:

```ts
import {
  truncateFilesByMatchBudget,
} from '@/features/find/cluster-search-lines'
import type { SearchFile, SearchResponse } from '@/features/find/schemas'

const MATCHES_PER_PROJECT = 10

function firstMatchLineNumber(file: SearchFile): number {
  for (const cluster of file.clusters) {
    for (const line of cluster.lines) {
      if (line.kind === 'match') {
        return line.lineNumber
      }
    }
  }

  return file.clusters[0]?.lines[0]?.lineNumber ?? 1
}

function clusterCopyText(lines: Array<{ lineText: string }>): string {
  return lines.map((line) => line.lineText).join('\n')
}
```

Keep `highlightMatchedText` as it is today.

- [ ] **Step 2: Replace the project results rendering block**

Replace the `searchResponse?.groups.map(...)` block with:

```tsx
{searchResponse?.groups.map((group) => {
  const visibleFiles = truncateFilesByMatchBudget(
    group.files,
    MATCHES_PER_PROJECT,
  )

  return (
    <div
      key={`${group.sourceId}:${group.projectName}`}
      className='grid grid-cols-1'
    >
      <div className='flex items-center justify-between py-2'>
        <h3 className='text-sm font-semibold'>
          {group.projectName}{' '}
          <span className='text-muted-foreground font-normal'>
            ({group.matchCount})
          </span>
        </h3>
        <span className='text-xs text-muted-foreground'>
          {group.sourceLabel}
        </span>
      </div>

      <div>
        {visibleFiles.map((file) => (
          <div
            key={file.absolutePath}
            className='border-t py-2 group/file-result'
          >
            <div className='flex items-center justify-between gap-2'>
              <Link
                href={{
                  pathname: '/find/file',
                  query: {
                    path: file.absolutePath,
                    line: String(firstMatchLineNumber(file)),
                  },
                }}
                className='text-xs font-mono hover:underline underline-offset-4'
              >
                {file.relativePath}
              </Link>

              <div className='flex shrink-0 items-center gap-0.5 opacity-0 group-hover/file-result:opacity-100 transition-[opacity] duration-100'>
                <Tooltip
                  tooltip='Copy file path'
                  render={
                    <CopyButton
                      copyText={file.absolutePath}
                      aria-label='Copy path'
                    />
                  }
                >
                  <CheckIcon className='absolute inset-0 m-auto opacity-0 group-data-[copied="true"]/copy-button:opacity-100' />
                  <FolderSearchIcon className='absolute inset-0 m-auto group-data-[copied="true"]/copy-button:opacity-0' />
                  <span className='sr-only'>Copy file path</span>
                </Tooltip>

                <Tooltip
                  tooltip='Open in Cursor'
                  render={
                    <Button
                      nativeButton={false}
                      variant='ghost'
                      size='icon-sm'
                      render={
                        <a
                          href={`cursor://file/${encodeURIComponent(
                            file.absolutePath,
                          )}:${firstMatchLineNumber(file)}`}
                          aria-label='Open in Cursor'
                        />
                      }
                    />
                  }
                >
                  <CursorIcon />
                </Tooltip>

                <Tooltip
                  tooltip='Open in Visual Studio Code'
                  render={
                    <Button
                      nativeButton={false}
                      variant='ghost'
                      size='icon-sm'
                      render={
                        <a
                          href={`vscode://file/${encodeURIComponent(
                            file.absolutePath,
                          )}:${firstMatchLineNumber(file)}`}
                          aria-label='Open in Visual Studio Code'
                        />
                      }
                    />
                  }
                >
                  <VisualStudioCode />
                </Tooltip>
              </div>
            </div>

            {file.clusters.map((cluster, clusterIndex) => (
              <div key={`${file.absolutePath}:${cluster.lines[0]?.lineNumber ?? clusterIndex}`}>
                {clusterIndex > 0 ? (
                  <div className='my-2 border-t border-dashed border-border/70' />
                ) : null}

                <div className='mt-1 group/cluster relative'>
                  <div className='absolute right-0 top-0 opacity-0 group-hover/cluster:opacity-100 transition-[opacity] duration-100'>
                    <Tooltip
                      tooltip='Copy snippet'
                      render={
                        <CopyButton
                          copyText={clusterCopyText(cluster.lines)}
                          aria-label='Copy snippet'
                        />
                      }
                    >
                      <CheckIcon className='absolute inset-0 m-auto opacity-0 group-data-[copied="true"]/copy-button:opacity-100' />
                      <CopyIcon className='absolute inset-0 m-auto group-data-[copied="true"]/copy-button:opacity-0' />
                      <span className='sr-only'>Copy code</span>
                    </Tooltip>
                  </div>

                  <div className='grid grid-cols-[auto_1fr] gap-x-3 text-xs font-mono leading-relaxed'>
                    {cluster.lines.map((line) => {
                      const href = {
                        pathname: '/find/file',
                        query: {
                          path: file.absolutePath,
                          line: String(line.lineNumber),
                        },
                      } as const

                      return (
                        <Link
                          key={`${file.absolutePath}:${line.lineNumber}:${line.kind}`}
                          href={href}
                          className={
                            line.kind === 'match'
                              ? 'col-span-2 grid grid-cols-subgrid bg-foreground/5 hover:bg-foreground/8'
                              : 'col-span-2 grid grid-cols-subgrid text-muted-foreground hover:bg-foreground/5'
                          }
                        >
                          <span className='select-none text-right text-muted-foreground tabular-nums py-0.5 pl-1'>
                            {line.lineNumber}
                          </span>
                          <pre className='overflow-x-auto overscroll-none no-scrollbar py-0.5 pr-8'>
                            <code>
                              {line.kind === 'match'
                                ? highlightMatchedText(
                                    line.lineText,
                                    line.matchRanges ?? [],
                                  )
                                : line.lineText}
                            </code>
                          </pre>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}

        {group.matchCount > MATCHES_PER_PROJECT ? (
          <p className='border-t py-2 text-xs text-muted-foreground'>
            Showing {MATCHES_PER_PROJECT} of {group.matchCount} matches for
            this project.
          </p>
        ) : null}
      </div>
    </div>
  )
})}
```

Remove the old per-match row that rendered `{relativePath}:{lineNumber}` and single-line snippets.

If `grid-cols-subgrid` proves awkward in this layout during manual check, fall back to each row as `grid grid-cols-[auto_1fr] gap-x-3` without subgrid — same visual result.

- [ ] **Step 3: Format, lint, typecheck**

Run:

```bash
pnpm lint:fix
pnpm lint
pnpm --filter web check-types
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/find/search-results.tsx
git commit -m "$(cat <<'EOF'
feat(find): render file-grouped search results with context gutters

EOF
)"
```

---

### Task 5: Manual verification

**Files:**
- None (manual only)

**Interfaces:**
- Consumes: running Find UI + local/GitHub sources already configured
- Produces: confirmation that the spec acceptance behaviors work

- [ ] **Step 1: Start the app and search**

Run:

```bash
pnpm --filter web dev
```

Open `/find`, ensure at least one local source exists, and search for a term that hits the same file more than once with enough gap for two clusters (or temporarily use a common token like `function` / `export`).

- [ ] **Step 2: Check acceptance criteria**

Verify:

1. Filename appears once per file, not on every line.
2. Line numbers appear in a left gutter.
3. Context lines (±2) surround matches and look muted.
4. Match rows have a light wash; matched tokens are highlighted.
5. Separate clusters in one file are separated by a dashed divider.
6. Project header count and “Showing 10 of N…” use match counts only.
7. Clicking a line opens `/find/file` at that line; file header opens at the first visible match.
8. Copy snippet copies the whole cluster; copy path / editor links still work on the file header.

- [ ] **Step 3: Final commit only if verification prompted fixes**

If Step 2 required code fixes, commit them:

```bash
git add apps/web/features/find apps/web/components/find/search-results.tsx
git commit -m "$(cat <<'EOF'
fix(find): polish context grouping results UI after smoke check

EOF
)"
```

If no fixes were needed, do not create an empty commit.

---

## Spec coverage checklist

| Spec requirement | Task |
|---|---|
| Parse rg `context` events; keep `--context 2` | Task 3 |
| Nested files → clusters → lines under projects | Tasks 1–3 |
| Ripgrep-style cluster gaps via non-contiguous lines | Task 2 |
| Match-only `totalMatches` / project `matchCount` | Tasks 2–3 |
| UI truncation by 10 matches; whole clusters | Tasks 2, 4 |
| Editor-gutter layout + dashed cluster gap | Task 4 |
| File header once; line click + header actions | Task 4 |
| Copy cluster snippet | Task 4 |
| Context-size UI control | Out of scope (explicit) |
