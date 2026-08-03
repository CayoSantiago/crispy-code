# Find Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/find` so search is the primary surface, with Sources/Sync in a side sheet, IDE-style `Aa`/`.*` toggles, path glob filtering, and a modern minimal UI.

**Architecture:** Slim the Find search/config API first, then decompose the UI into `SearchChrome`, `SearchResults`, `SearchPanel`, and `SourcesSheet`, and recompose `FindWorkspace` around a search-first layout. Business logic (oRPC mutations, ripgrep) stays; placement and filter surface change.

**Tech Stack:** Next.js App Router, oRPC + TanStack Query, zod, `@repo/ui` (`Sheet`, `Tabs`, `Input`, `Button`), Biome, pnpm + Turborepo.

**Spec:** `docs/superpowers/specs/2026-08-02-find-page-redesign-design.md`

## Global Constraints

- Search-first, modern/minimal UI: no titled Cards on the main Find surface; quiet Sources text button; flat results with hairline separators.
- IDE-style toggles inside the search input: `Aa` = case sensitive, `.*` = regex. No whole-word control.
- Full removal of: `wholeWord`, `extension`, `pathFilter`, `sourceFilter`, `recentSearches`, `sourceOptions` from UI + API + config.
- Path filter is `pathGlob` → `rg --glob` when non-empty.
- Sources + Sync live in one right `Sheet` with tabs (Sources | Sync). Empty-sources CTA opens the sheet (no auto-open).
- No new unit test framework. Verify with `pnpm --filter web check-types`, `pnpm lint:fix`, `pnpm lint`, plus manual smoke from the spec.
- Code style: Biome — single quotes, no semicolons. Run `pnpm lint:fix` before each commit.
- Stay inside `apps/web` Find/UI surface; do not add packages.
- Follow Next.js guidance in `node_modules/next/dist/docs/` if route/server boundaries change.

## File structure

| File | Responsibility |
|---|---|
| `apps/web/features/find/schemas.ts` | Slim search RPC input/response schemas |
| `apps/web/features/find/search.ts` | `SearchOptions` + ripgrep args (`pathGlob`, drop removed filters) |
| `apps/web/features/find/service.ts` | `executeSearch` without recent searches / sourceOptions |
| `apps/web/features/find/config/schemas.ts` | Drop `recentSearches` / `MAX_RECENT_SEARCHES` |
| `apps/web/features/find/config/service.ts` | Default config without `recentSearches` |
| `apps/web/components/find/search-chrome.tsx` | Controlled search input + `Aa`/`.*` + path glob |
| `apps/web/components/find/search-results.tsx` | Flat results list + empty/error states |
| `apps/web/components/find/search-panel.tsx` | Owns search state + query; composes chrome + results |
| `apps/web/components/find/sources-panel.tsx` | Local roots + GitHub lookup/selection |
| `apps/web/components/find/sync-panel.tsx` | GitHub mirror sync (former card content, no Card) |
| `apps/web/components/find/sources-sheet.tsx` | Sheet + Sources/Sync tabs |
| `apps/web/components/find/find-workspace.tsx` | Header, sheet state, SearchPanel, SourcesSheet |
| `apps/web/app/find/page.tsx` | Prefetch + hydrate; title moves into workspace |
| Delete: `apps/web/components/find/search-card.tsx` | Replaced by SearchPanel pieces |
| Delete: `apps/web/components/find/github-mirror-sync-card.tsx` | Replaced by `sync-panel.tsx` |

---

### Task 1: Slim search API and Find config

**Files:**
- Modify: `apps/web/features/find/schemas.ts`
- Modify: `apps/web/features/find/search.ts`
- Modify: `apps/web/features/find/service.ts`
- Modify: `apps/web/features/find/config/schemas.ts`
- Modify: `apps/web/features/find/config/service.ts`

**Interfaces:**
- Consumes: existing `searchAcrossSources` / `groupMatchesByProject` / `readFindConfig`
- Produces:
  - `SearchRpcInput`: `{ query, mode, caseSensitive, pathGlob }`
  - `SearchOptions`: same fields + optional `maxResultsPerSource`
  - `SearchResponse`: `{ groups, totalMatches, missingSources }` (no `recentSearches`, no `sourceOptions`)
  - `FindConfig`: `{ localRoots, githubRepos }` only

- [ ] **Step 1: Update search schemas**

Replace the search input/response pieces in `apps/web/features/find/schemas.ts` with:

```ts
export const searchModeSchema = z.enum(['literal', 'regex'])

export const searchRpcInputSchema = z.object({
  query: z.string().trim().min(1, 'Missing query.'),
  mode: searchModeSchema.default('literal'),
  caseSensitive: z.boolean().default(false),
  pathGlob: z.string().default(''),
})

// searchMatchSchema / searchGroupSchema unchanged

const sourceRefSchema = z.object({ id: z.string(), label: z.string() })

export const searchResponseSchema = z.object({
  groups: z.array(searchGroupSchema),
  totalMatches: z.number(),
  missingSources: z.array(sourceRefSchema),
})
```

Keep the GitHub/sync schemas below unchanged.

- [ ] **Step 2: Update `SearchOptions` and ripgrep in `search.ts`**

Replace `SearchOptions` with:

```ts
export type SearchOptions = {
  query: string
  mode: SearchMode
  caseSensitive: boolean
  pathGlob: string
  maxResultsPerSource?: number
}
```

Remove `normalizePathFilter` and `normalizeExtension`.

In `runRipgrep`, remove extension/pathFilter/wholeWord handling. Use:

```ts
const pathGlob = options.pathGlob.trim()
const maxResults = options.maxResultsPerSource ?? 100

const args = [
  '--json',
  '--line-number',
  '--max-count',
  String(maxResults),
  '--ignore-case',
]

if (options.caseSensitive) {
  args.push('--case-sensitive')
}

if (options.mode === 'literal') {
  args.push('--fixed-strings')
}

if (pathGlob) {
  args.push('--glob', pathGlob)
}

args.push('--regexp', options.query)
```

In the stdout match loop, push every match (no substring path filter).

In `searchAcrossSources`, always search all provided sources:

```ts
const all = await Promise.all(
  sources.map((source) => runRipgrep(source, options, signal)),
)
```

- [ ] **Step 3: Simplify `executeSearch`**

Replace `apps/web/features/find/service.ts` with:

```ts
import { readFindConfig } from '@/features/find/config/service'
import type { SearchResponse } from '@/features/find/schemas'
import {
  getSearchSources,
  groupMatchesByProject,
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
  const matches = await searchAcrossSources(
    sourceSet.available,
    options,
    signal,
  )
  const grouped = groupMatchesByProject(matches)

  return {
    groups: grouped,
    totalMatches: matches.length,
    missingSources: sourceSet.missing.map((source) => ({
      id: source.id,
      label: source.label,
    })),
  }
}
```

- [ ] **Step 4: Drop recent searches from config**

In `apps/web/features/find/config/schemas.ts`, remove `MAX_RECENT_SEARCHES` and `recentSearches` from `findConfigSchema`:

```ts
export const findConfigSchema = z.object({
  localRoots: resilientArray(localRootSourceSchema),
  githubRepos: resilientArray(gitHubRepoSourceSchema),
})
```

In `apps/web/features/find/config/service.ts`, change the default to:

```ts
defaultValue: {
  localRoots: [],
  githubRepos: [],
},
```

- [ ] **Step 5: Typecheck (expect UI errors until later tasks)**

Run: `pnpm --filter web check-types`

Expected: failures only in Find UI files still referencing removed fields (`search-card.tsx`, `find-workspace.tsx` emptyConfig). Backend/schema files should be clean.

- [ ] **Step 6: Commit**

```bash
git add apps/web/features/find/schemas.ts \
  apps/web/features/find/search.ts \
  apps/web/features/find/service.ts \
  apps/web/features/find/config/schemas.ts \
  apps/web/features/find/config/service.ts
git commit -m "$(cat <<'EOF'
refactor(find): slim search API and drop recent searches

Remove unused filters from ripgrep/config so the Find redesign can rebuild the UI against a smaller contract.
EOF
)"
```

---

### Task 2: SearchChrome + SearchResults + SearchPanel

**Files:**
- Create: `apps/web/components/find/search-chrome.tsx`
- Create: `apps/web/components/find/search-results.tsx`
- Create: `apps/web/components/find/search-panel.tsx`

**Interfaces:**
- Consumes: `orpc.find.search`, `orpc.find.getConfig`, `useDebounce`, `SearchResponse`, `SearchMode`
- Produces:
  - `SearchChromeProps`: `{ query, mode, caseSensitive, pathGlob, onQueryChange, onModeChange, onCaseSensitiveChange, onPathGlobChange }`
  - `SearchResultsProps`: `{ hasNoSources, isPending, errorMessage, searchResponse, onOpenSources }`
  - `SearchPanel({ onOpenSources }: { onOpenSources: () => void })`

- [ ] **Step 1: Create `SearchChrome`**

Create `apps/web/components/find/search-chrome.tsx`:

```tsx
'use client'

import { Input } from '@repo/ui/components/input'
import { cn } from '@repo/ui/lib/utils'
import type { SearchMode } from '@/features/find/schemas'

export type SearchChromeProps = {
  query: string
  mode: SearchMode
  caseSensitive: boolean
  pathGlob: string
  onQueryChange: (value: string) => void
  onModeChange: (mode: SearchMode) => void
  onCaseSensitiveChange: (value: boolean) => void
  onPathGlobChange: (value: string) => void
}

function SearchToggle({
  pressed,
  label,
  title,
  onPressedChange,
  className,
}: {
  pressed: boolean
  label: string
  title: string
  onPressedChange: (next: boolean) => void
  className?: string
}) {
  return (
    <button
      type='button'
      title={title}
      aria-label={title}
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        'rounded-sm px-1.5 py-0.5 text-xs font-medium leading-none transition-colors',
        pressed
          ? 'bg-primary/15 text-foreground'
          : 'text-muted-foreground hover:text-foreground',
        className,
      )}
    >
      {label}
    </button>
  )
}

export function SearchChrome({
  query,
  mode,
  caseSensitive,
  pathGlob,
  onQueryChange,
  onModeChange,
  onCaseSensitiveChange,
  onPathGlobChange,
}: SearchChromeProps) {
  return (
    <div className='grid gap-2'>
      <div className='flex items-center gap-1 rounded-lg border bg-background px-3 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50'>
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder='Search code...'
          autoComplete='off'
          className='h-11 border-0 bg-transparent px-0 shadow-none focus-visible:border-0 focus-visible:ring-0'
        />
        <div className='flex shrink-0 items-center gap-0.5'>
          <SearchToggle
            pressed={caseSensitive}
            label='Aa'
            title='Match Case'
            onPressedChange={onCaseSensitiveChange}
          />
          <SearchToggle
            pressed={mode === 'regex'}
            label='.*'
            title='Use Regular Expression'
            onPressedChange={(next) =>
              onModeChange(next ? 'regex' : 'literal')
            }
            className='font-mono'
          />
        </div>
      </div>
      <Input
        value={pathGlob}
        onChange={(event) => onPathGlobChange(event.target.value)}
        placeholder='Path glob — **/*.{ts,tsx}'
        autoComplete='off'
        className='h-9 text-xs text-muted-foreground'
      />
    </div>
  )
}
```

- [ ] **Step 2: Create `SearchResults`**

Create `apps/web/components/find/search-results.tsx`. Port result rendering from `search-card.tsx`, but:

- No Card wrapper
- Accept props listed above
- Empty sources state uses a text button calling `onOpenSources`
- Flat list: project header row + hairline-separated match rows
- Keep copy / open-in-editor / file link actions (prefer `size='icon-sm'` ghost buttons)
- Keep `highlightMatchedText` helper (move from `search-card.tsx`)

Key empty-sources block:

```tsx
{hasNoSources ? (
  <Empty>
    <EmptyHeader>
      <EmptyTitle>Start by adding a source</EmptyTitle>
      <EmptyDescription>
        Add a local folder or select GitHub repositories, then search across
        your code.
      </EmptyDescription>
    </EmptyHeader>
    <Button type='button' variant='outline' size='sm' onClick={onOpenSources}>
      Open Sources
    </Button>
  </Empty>
) : null}
```

Match rows: use `border-t` separators and avoid nested `rounded-md border bg-card` cards where a separator + padding is enough. Keep the path link and action row.

- [ ] **Step 3: Create `SearchPanel`**

Create `apps/web/components/find/search-panel.tsx`:

```tsx
'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { SearchChrome } from '@/components/find/search-chrome'
import { SearchResults } from '@/components/find/search-results'
import type { SearchMode, SearchResponse } from '@/features/find/schemas'
import { useDebounce } from '@/hooks/use-debounce'
import { orpc } from '@/lib/orpc/client'

export function SearchPanel({
  onOpenSources,
}: {
  onOpenSources: () => void
}) {
  const configQuery = useQuery(orpc.find.getConfig.queryOptions())

  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 220)
  const [mode, setMode] = useState<SearchMode>('literal')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [pathGlob, setPathGlob] = useState('')

  const searchInput = {
    query: debouncedQuery.trim(),
    mode,
    caseSensitive,
    pathGlob,
  }

  const searchResult = useQuery(
    orpc.find.search.queryOptions({
      input: searchInput,
      enabled: searchInput.query.length > 0,
      placeholderData: keepPreviousData,
    }),
  )

  const searchResponse: SearchResponse | null = query.trim()
    ? (searchResult.data ?? null)
    : null

  const hasNoSources =
    configQuery.isSuccess &&
    configQuery.data.localRoots.length === 0 &&
    configQuery.data.githubRepos.length === 0

  return (
    <div className='grid gap-6'>
      <SearchChrome
        query={query}
        mode={mode}
        caseSensitive={caseSensitive}
        pathGlob={pathGlob}
        onQueryChange={setQuery}
        onModeChange={setMode}
        onCaseSensitiveChange={setCaseSensitive}
        onPathGlobChange={setPathGlob}
      />
      <SearchResults
        hasNoSources={hasNoSources}
        isPending={searchResult.isFetching}
        errorMessage={
          searchResult.error ? searchResult.error.message : null
        }
        searchResponse={searchResponse}
        onOpenSources={onOpenSources}
      />
    </div>
  )
}
```

- [ ] **Step 4: Lint the new files**

Run: `pnpm lint:fix && pnpm --filter web check-types`

Expected: new files clean; old `search-card.tsx` / workspace may still fail until Task 4.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/find/search-chrome.tsx \
  apps/web/components/find/search-results.tsx \
  apps/web/components/find/search-panel.tsx
git commit -m "$(cat <<'EOF'
feat(find): add search chrome, results, and panel

Introduce the search-first UI pieces with IDE-style case/regex toggles and path glob.
EOF
)"
```

---

### Task 3: SourcesSheet with Sources and Sync panels

**Files:**
- Create: `apps/web/components/find/sources-panel.tsx`
- Create: `apps/web/components/find/sync-panel.tsx`
- Create: `apps/web/components/find/sources-sheet.tsx`

**Interfaces:**
- Consumes: existing `orpc.find.*` mutations from current `FindWorkspace` / `GitHubMirrorSyncCard`
- Produces:
  - `SourcesPanel()` — local roots + GitHub lookup UI (no Card)
  - `SyncPanel()` — sync/remove UI (no Card)
  - `SourcesSheet({ open, onOpenChange, defaultTab? }: { open: boolean; onOpenChange: (open: boolean) => void; defaultTab?: 'sources' | 'sync' })`

- [ ] **Step 1: Extract `SourcesPanel`**

Move the Sources card body from `find-workspace.tsx` (local path form, local roots list, GitHub owner lookup, repo checkboxes, related mutations/state) into `apps/web/components/find/sources-panel.tsx`.

Requirements:

- `'use client'`
- No `Card` / `CardHeader` / `CardTitle`
- Keep the same oRPC mutations and validation error display
- Layout: `grid gap-6` with existing Field/Input/Button patterns
- Export `export function SourcesPanel()`

- [ ] **Step 2: Extract `SyncPanel`**

Copy `github-mirror-sync-card.tsx` into `apps/web/components/find/sync-panel.tsx`, then:

- Rename to `SyncPanel`
- Remove `Card` / `CardHeader` / `CardTitle` wrappers; render the inner grid directly
- Update empty-state copy from “on the left” to “on the Sources tab”
- Keep sync + remove mutations identical

- [ ] **Step 3: Create `SourcesSheet`**

Create `apps/web/components/find/sources-sheet.tsx`:

```tsx
'use client'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@repo/ui/components/sheet'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/ui/components/tabs'
import { SourcesPanel } from '@/components/find/sources-panel'
import { SyncPanel } from '@/components/find/sync-panel'

export function SourcesSheet({
  open,
  onOpenChange,
  defaultTab = 'sources',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTab?: 'sources' | 'sync'
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side='right' className='w-full sm:max-w-md'>
        <SheetHeader className='border-b'>
          <SheetTitle>Sources</SheetTitle>
        </SheetHeader>
        <Tabs defaultValue={defaultTab} className='flex min-h-0 flex-1 flex-col px-4 pb-4'>
          <TabsList variant='line' className='w-full'>
            <TabsTrigger value='sources'>Sources</TabsTrigger>
            <TabsTrigger value='sync'>Sync</TabsTrigger>
          </TabsList>
          <TabsContent value='sources' className='overflow-y-auto pt-4'>
            <SourcesPanel />
          </TabsContent>
          <TabsContent value='sync' className='overflow-y-auto pt-4'>
            <SyncPanel />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
```

If Base UI Tabs require a controlled `value` when remounting with a new default, use controlled state synced when `open` becomes true:

```tsx
const [tab, setTab] = useState(defaultTab)
// when open flips to true, setTab(defaultTab)
```

- [ ] **Step 4: Lint new sheet files**

Run: `pnpm lint:fix`

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/find/sources-panel.tsx \
  apps/web/components/find/sync-panel.tsx \
  apps/web/components/find/sources-sheet.tsx
git commit -m "$(cat <<'EOF'
feat(find): add Sources sheet with Sources and Sync tabs

Move source setup and GitHub mirror sync into a toggleable side panel.
EOF
)"
```

---

### Task 4: Recompose FindWorkspace and retire old cards

**Files:**
- Modify: `apps/web/components/find/find-workspace.tsx`
- Modify: `apps/web/app/find/page.tsx`
- Delete: `apps/web/components/find/search-card.tsx`
- Delete: `apps/web/components/find/github-mirror-sync-card.tsx`

**Interfaces:**
- Consumes: `SearchPanel`, `SourcesSheet`
- Produces: `FindWorkspace()` owning sheet open state and header row

- [ ] **Step 1: Rewrite `FindWorkspace`**

Replace `apps/web/components/find/find-workspace.tsx` with a thin shell:

```tsx
'use client'

import { Button } from '@repo/ui/components/button'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { SearchPanel } from '@/components/find/search-panel'
import { SourcesSheet } from '@/components/find/sources-sheet'
import { orpc } from '@/lib/orpc/client'

export function FindWorkspace() {
  const configQuery = useQuery(orpc.find.getConfig.queryOptions())
  const [sourcesOpen, setSourcesOpen] = useState(false)

  return (
    <>
      <div className='flex items-baseline justify-between gap-4'>
        <h1 className='text-3xl font-semibold tracking-tight'>Code Finder</h1>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='text-muted-foreground'
          onClick={() => setSourcesOpen(true)}
        >
          Sources
        </Button>
      </div>

      {configQuery.isError ? (
        <div className='rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs'>
          Failed to load your sources: {configQuery.error.message}
        </div>
      ) : null}

      <SearchPanel onOpenSources={() => setSourcesOpen(true)} />

      <SourcesSheet open={sourcesOpen} onOpenChange={setSourcesOpen} />
    </>
  )
}
```

- [ ] **Step 2: Simplify the Find page**

Update `apps/web/app/find/page.tsx` so the title lives in the workspace (remove the page-level `<h1>`):

```tsx
return (
  <div className='grid grid-cols-1 gap-6 w-full'>
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FindWorkspace />
    </HydrationBoundary>
  </div>
)
```

- [ ] **Step 3: Delete retired components**

Delete:

- `apps/web/components/find/search-card.tsx`
- `apps/web/components/find/github-mirror-sync-card.tsx`

Confirm no remaining imports:

```bash
rg "search-card|SearchCard|github-mirror-sync-card|GitHubMirrorSyncCard|recentSearches|wholeWord|sourceFilter|pathFilter" apps/web
```

Expected: no matches (except possibly historical docs).

- [ ] **Step 4: Typecheck and lint**

Run:

```bash
pnpm lint:fix
pnpm lint
pnpm --filter web check-types
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/find/find-workspace.tsx \
  apps/web/app/find/page.tsx \
  apps/web/components/find/search-card.tsx \
  apps/web/components/find/github-mirror-sync-card.tsx
git commit -m "$(cat <<'EOF'
feat(find): search-first workspace with Sources sheet

Make search the main surface and retire the old dual-card Find layout.
EOF
)"
```

---

### Task 5: Manual smoke verification

**Files:**
- None (verification only)

- [ ] **Step 1: Run the web app**

```bash
pnpm --filter web dev
```

Open `/find`.

- [ ] **Step 2: Walk the spec checklist**

1. Search control is primary; page feels sparse/minimal; no Sources/Sync cards in the main column.
2. Sources button opens the right sheet; Sources and Sync tabs both work.
3. Add a local root; select and sync a GitHub repo from the sheet.
4. With no sources, empty CTA opens the sheet.
5. `Aa` and `.*` sit inside the search input and affect results; whole-word is absent.
6. Path glob `**/*.ts` (or similar) narrows paths; clearing it restores broader results.
7. Removed controls are gone; search RPC no longer accepts removed fields (already covered by Task 1 schemas).

- [ ] **Step 3: Fix any UI issues found**

If spacing/toggle focus styles are off, adjust only `search-chrome.tsx` / `search-results.tsx` / `sources-sheet.tsx`. Re-run lint/typecheck. Commit fixes if needed:

```bash
git add apps/web/components/find
git commit -m "$(cat <<'EOF'
fix(find): polish search-first UI after smoke test
EOF
)"
```

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|---|---|
| Search-first layout / quiet Sources button | Task 4 |
| Sources sheet with Sources \| Sync tabs | Task 3 |
| IDE `Aa` / `.*` toggles in input | Task 2 |
| Path glob via `rg --glob` | Task 1 + Task 2 |
| Remove whole word, sources filter, recent searches, path contains, extension | Task 1 + Task 4 delete |
| Empty-sources CTA opens sheet | Task 2 + Task 4 |
| Modern/minimal flat results | Task 2 |
| Component decomposition | Tasks 2–4 |
| Manual verification only | Task 5 |
