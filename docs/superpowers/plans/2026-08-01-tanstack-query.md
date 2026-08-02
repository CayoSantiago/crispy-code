# TanStack Query Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install TanStack Query app-wide and migrate the Code Finder to it: config and search reads via `useQuery` (search through a cancellable GET route handler), writes via `useMutation` with cache invalidation.

**Architecture:** A client `QueryClientProvider` mounts in the root layout (SSR-safe: fresh client per server request, lazy browser singleton). `/find` prefetches the find config server-side and hydrates it via `HydrationBoundary`. Search moves from a Server Action to `GET /api/find/search` so TanStack Query's `AbortSignal` can cancel stale keystrokes. The five write flows stay Server Actions, wrapped in `useMutation` with invalidation of a shared query-key factory.

**Tech Stack:** Next.js 16.2.6 (App Router), React 19.2.4, TanStack Query v5 (`@tanstack/react-query`, `@tanstack/react-query-devtools`), pnpm workspaces, Biome.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-01-tanstack-query-design.md`.
- This Next.js version differs from training data. Bundled docs live at `node_modules/.pnpm/next@16.2.6_react-dom@19.2.4_react@19.2.4__react@19.2.4/node_modules/next/dist/docs/` — consult them if route handler or hydration behavior surprises you.
- Package manager is pnpm (`pnpm@10.33.4`); install into the web app with `pnpm --filter web add <pkg>` from the repo root.
- QueryClient defaults: `staleTime: 30_000`, `retry: 1` (exact values from the spec).
- No test framework exists and the spec mandates manual verification only. Every task's verify steps are: `pnpm check-types`, `pnpm lint` (Biome; `pnpm lint:fix` to autofix formatting/import order), and dev-server checks with `pnpm --filter web dev` (serves on http://localhost:3000).
- TanStack Query owns server state only; input text, mode, filters, and other UI state stay as plain `useState`.
- The repo commits directly to `main`. Commit at the end of every task with the message given in the task.

---

### Task 1: Install packages and mount the app-wide provider

**Files:**
- Create: `apps/web/app/providers.tsx`
- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/package.json` (via pnpm, not by hand)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `Providers` component (`{ children: React.ReactNode }`) wrapping the app in `QueryClientProvider`; every later task can assume a QueryClient is in React context.

- [ ] **Step 1: Install dependencies**

Run from the repo root:

```bash
pnpm --filter web add @tanstack/react-query @tanstack/react-query-devtools
```

Expected: both packages appear under `dependencies` in `apps/web/package.json` at the latest v5.x versions.

- [ ] **Step 2: Create the provider**

Create `apps/web/app/providers.tsx` exactly as follows. The `getQueryClient` shape is the official SSR pattern: the server makes a fresh client per request (no cross-request leakage), the browser lazily creates one singleton at module scope (not in `useState`, so a suspended initial render cannot discard it).

```tsx
'use client'

import {
  isServer,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

function getQueryClient() {
  if (isServer) {
    return makeQueryClient()
  }

  browserQueryClient ??= makeQueryClient()
  return browserQueryClient
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

- [ ] **Step 3: Mount it in the root layout**

In `apps/web/app/layout.tsx`, import the provider and wrap the existing children inside `ThemeProvider`:

```tsx
import { Geist_Mono, Inter } from 'next/font/google'

import '@repo/ui/globals.css'
import { cn } from '@repo/ui/lib/utils'
import { Providers } from '@/app/providers'
import { ThemeProvider } from '@/components/theme-provider'
import { highlightCss } from '@/lib/highlight'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

const fontMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang='en'
      suppressHydrationWarning
      className={cn(
        'antialiased',
        fontMono.variable,
        'font-sans',
        inter.variable,
        'scroll-smooth',
      )}
    >
      <body suppressHydrationWarning>
        <ThemeProvider>
          <Providers>
            {children}
            {/** biome-ignore lint/security/noDangerouslySetInnerHtml: fine here */}
            <style dangerouslySetInnerHTML={{ __html: highlightCss }} />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Verify**

```bash
pnpm check-types
pnpm lint
```

Expected: both pass. Then run `pnpm --filter web dev`, open http://localhost:3000, and confirm the page renders and the TanStack Query devtools toggle (floating palm-tree icon, bottom corner) appears.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/providers.tsx apps/web/app/layout.tsx apps/web/package.json pnpm-lock.yaml
git commit -m "feat(query): install tanstack query and mount app-wide provider"
```

---

### Task 2: Query key factory, search service, GET route handler, and client fetcher

**Files:**
- Create: `apps/web/lib/find/keys.ts`
- Create: `apps/web/lib/find/search-service.ts`
- Create: `apps/web/app/api/find/search/route.ts`
- Create: `apps/web/lib/find/search-client.ts`
- Modify: `apps/web/app/find/actions.ts` (lines 61-67 and 376-404: `SearchResponse` type and `searchCode` body move to the service)

**Interfaces:**
- Consumes: existing `SearchOptions` from `apps/web/lib/find/search.ts`; existing config helpers from `apps/web/lib/find/config.ts`.
- Produces:
  - `findKeys.all`, `findKeys.config()`, `findKeys.searches()`, `findKeys.search(params: SearchOptions)` — the only query keys used anywhere.
  - `executeSearch(options: SearchOptions): Promise<SearchResponse>` (server-only).
  - `fetchSearchResults(options: SearchOptions, signal?: AbortSignal): Promise<SearchResponse>` and re-exported `SearchResponse` type (client-safe).
  - `GET /api/find/search` returning `SearchResponse` JSON; 400 `{ error }` on missing query, 500 `{ error }` on failure.

- [ ] **Step 1: Create the query key factory**

Create `apps/web/lib/find/keys.ts`:

```ts
import type { SearchOptions } from '@/lib/find/search'

export const findKeys = {
  all: ['find'] as const,
  config: () => [...findKeys.all, 'config'] as const,
  searches: () => [...findKeys.all, 'search'] as const,
  search: (params: SearchOptions) => [...findKeys.searches(), params] as const,
}
```

(Objects in query keys are hashed structurally by TanStack Query, so passing the `params` object directly is correct.)

- [ ] **Step 2: Create the search service**

Create `apps/web/lib/find/search-service.ts`. This is the body of the current `searchCode` action moved to a plain server module so both the route handler and (temporarily) the action share it. One simplification: `updateFindConfig` already returns the updated config, so the original's second `readFindConfig()` call is dropped.

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

export type SearchResponse = {
  groups: ReturnType<typeof groupMatchesByProject>
  totalMatches: number
  missingSources: Array<{ id: string; label: string }>
  sourceOptions: Array<{ id: string; label: string }>
  recentSearches: string[]
}

export async function executeSearch(
  options: SearchOptions,
): Promise<SearchResponse> {
  const config = await readFindConfig()
  const sourceSet = await getSearchSources(config)
  const matches = await searchAcrossSources(sourceSet.available, options)
  const grouped = groupMatchesByProject(matches)

  const updated = await updateFindConfig((current) => ({
    ...current,
    recentSearches: addRecentSearches(current.recentSearches, options.query),
  }))

  return {
    groups: grouped,
    totalMatches: matches.length,
    missingSources: sourceSet.missing.map((source) => ({
      id: source.id,
      label: source.label,
    })),
    sourceOptions: sourceSet.available.map((source) => ({
      id: source.id,
      label: source.label,
    })),
    recentSearches: updated.recentSearches,
  }
}
```

- [ ] **Step 3: Point the existing action at the service**

In `apps/web/app/find/actions.ts`:

1. Delete the `SearchResponse` type definition (currently lines 61-67) and replace it with a type re-export so the workspace's existing `import type { SearchResponse } from '@/app/find/actions'` keeps compiling until Task 4:

```ts
export type { SearchResponse } from '@/lib/find/search-service'
```

2. Replace the whole `searchCode` function body (currently lines 376-404) with a delegation:

```ts
export async function searchCode(
  options: SearchOptions,
): Promise<SearchResponse> {
  return executeSearch(options)
}
```

3. Update imports: add `import { executeSearch, type SearchResponse } from '@/lib/find/search-service'` and remove the now-unused imports `addRecentSearches`, `getSearchSources`, `groupMatchesByProject`, `searchAcrossSources` (keep `readFindConfig`, `updateFindConfig`, `SearchOptions` — they are still used elsewhere in the file).

Note: `'use server'` files may only export async functions at runtime; `export type` re-exports are erased at compile time and are fine (the file already exports several types).

- [ ] **Step 4: Create the route handler**

Create `apps/web/app/api/find/search/route.ts`:

```ts
import type { NextRequest } from 'next/server'
import type { SearchOptions } from '@/lib/find/search'
import { executeSearch } from '@/lib/find/search-service'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const query = params.get('query')?.trim() ?? ''

  if (!query) {
    return Response.json({ error: 'Missing query parameter.' }, { status: 400 })
  }

  const options: SearchOptions = {
    query,
    mode: params.get('mode') === 'regex' ? 'regex' : 'literal',
    caseSensitive: params.get('caseSensitive') === 'true',
    wholeWord: params.get('wholeWord') === 'true',
    extension: params.get('extension') ?? '',
    pathFilter: params.get('pathFilter') ?? '',
    sourceFilter: params.get('sourceFilter') ?? '',
    maxResultsPerSource: 50,
  }

  try {
    return Response.json(await executeSearch(options))
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : 'Search failed unexpectedly.',
      },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 5: Create the client fetcher**

Create `apps/web/lib/find/search-client.ts`. The type-only import from the server module is erased at compile time, so no server code leaks into the client bundle.

```ts
import type { SearchOptions } from '@/lib/find/search'
import type { SearchResponse } from '@/lib/find/search-service'

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

  return response.json() as Promise<SearchResponse>
}
```

- [ ] **Step 6: Verify**

```bash
pnpm check-types
pnpm lint
```

Expected: both pass. Then with `pnpm --filter web dev` running:

```bash
curl -s 'http://localhost:3000/api/find/search?query=function&mode=literal' | head -c 400
curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:3000/api/find/search'
```

Expected: the first prints JSON starting with `{"groups":`; the second prints `400`. Also confirm the existing `/find` search UI still works (it still goes through the `searchCode` action, now delegating to the service).

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/find/keys.ts apps/web/lib/find/search-service.ts apps/web/app/api/find/search/route.ts apps/web/lib/find/search-client.ts apps/web/app/find/actions.ts
git commit -m "feat(find): add query keys, search service, GET search route, and client fetcher"
```

---

### Task 3: Config through Query — read action, server prefetch, hydration, config useQuery

**Files:**
- Modify: `apps/web/app/find/actions.ts` (add `getFindConfig`)
- Modify: `apps/web/app/find/page.tsx` (prefetch + `HydrationBoundary`, drop hardcoded `initialConfig`)
- Modify: `apps/web/components/find/find-workspace.tsx` (config `useState` → `useQuery`; `setConfig` calls → invalidation/`setQueryData`)

**Interfaces:**
- Consumes: `findKeys` from Task 2; existing `getFindConfigData` in `apps/web/app/find/data.ts`.
- Produces: `getFindConfig(): Promise<FindConfig>` server action; `FindWorkspace` takes **no props** from here on; config cache lives at `findKeys.config()`.

- [ ] **Step 1: Add the read action**

In `apps/web/app/find/actions.ts`, add (anywhere after the imports; `readFindConfig` and `FindConfig` come from `@/lib/find/config` — add `type FindConfig` to that existing import):

```ts
export async function getFindConfig(): Promise<FindConfig> {
  return readFindConfig()
}
```

- [ ] **Step 2: Prefetch and hydrate in the page**

Replace `apps/web/app/find/page.tsx` entirely:

```tsx
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query'
import { getFindConfigData } from '@/app/find/data'
import { FindWorkspace } from '@/components/find/find-workspace'
import { findKeys } from '@/lib/find/keys'

export default async function FindPage() {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: findKeys.config(),
    queryFn: getFindConfigData,
  })

  return (
    <div className='grid gap-6 w-full'>
      <h1 className='text-3xl font-semibold tracking-tight'>Code Finder</h1>

      <HydrationBoundary state={dehydrate(queryClient)}>
        <FindWorkspace />
      </HydrationBoundary>
    </div>
  )
}
```

This finally uses the previously-dead `getFindConfigData` and fixes the hardcoded empty `initialConfig`.

- [ ] **Step 3: Migrate config state in the workspace**

In `apps/web/components/find/find-workspace.tsx`:

1. Add imports:

```tsx
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { findKeys } from '@/lib/find/keys'
```

Add `getFindConfig` to the `@/app/find/actions` import list. Change `import type { FindConfig }` usage: the type import from `@/lib/find/config` stays.

2. Add a module-level fallback above the component (used only before hydration lands, e.g. if the component is ever mounted outside `/find`):

```tsx
const emptyConfig: FindConfig = {
  localRoots: [],
  githubRepos: [],
  recentSearches: [],
}
```

3. Change the signature to take no props:

```tsx
export function FindWorkspace() {
```

4. Replace `const [config, setConfig] = useState(initialConfig)` with:

```tsx
const queryClient = useQueryClient()
const configQuery = useQuery({
  queryKey: findKeys.config(),
  queryFn: () => getFindConfig(),
})
const config = configQuery.data ?? emptyConfig
```

5. Replace every `setConfig(...)` call site (there are four):

   a. In the `removeLocalRoot` click handler transition — replace the `setConfig((current) => ({ ...current, localRoots: ... }))` block with:

```tsx
await queryClient.invalidateQueries({ queryKey: findKeys.config() })
```

   b. In the repo-selection checkbox transition — replace the whole `setConfig((current) => { ... })` block (the one adding/removing from `githubRepos`) with:

```tsx
await queryClient.invalidateQueries({ queryKey: findKeys.config() })
```

   c. In the sync button transition — replace the `setConfig((current) => ({ ...current, githubRepos: ... }))` block with:

```tsx
await queryClient.invalidateQueries({ queryKey: findKeys.config() })
```

   (Keep the `setSyncMessages(nextMessages)` line — sync messages stay local UI state.)

   d. In the debounced search effect — replace the `setConfig((current) => ({ ...current, recentSearches: response.recentSearches }))` block with:

```tsx
queryClient.setQueryData<FindConfig>(findKeys.config(), (current) =>
  current ? { ...current, recentSearches: response.recentSearches } : current,
)
```

6. Remove `useState`'s `initialConfig` usages; keep the rest of the component untouched (search still goes through the `searchCode` action until Task 4).

- [ ] **Step 4: Verify**

```bash
pnpm check-types
pnpm lint
```

Expected: both pass. With the dev server running, on http://localhost:3000/find confirm:
- Previously configured sources appear immediately on load (no empty flash) — this is the prefetch + hydration working.
- Devtools shows a `['find', 'config']` query in "fresh" state on load, with no immediate refetch.
- Adding a local root (form), removing one, and toggling a GitHub repo selection each refresh the visible source list (via invalidation) without a page reload.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/find/actions.ts apps/web/app/find/page.tsx apps/web/components/find/find-workspace.tsx
git commit -m "feat(find): serve find config through tanstack query with server prefetch"
```

---

### Task 4: Search through useQuery with cancellation and keepPreviousData

**Files:**
- Modify: `apps/web/components/find/find-workspace.tsx` (search effect + state → `useQuery`)
- Modify: `apps/web/app/find/actions.ts` (delete `searchCode`)

**Interfaces:**
- Consumes: `findKeys.search(params)` and `fetchSearchResults(options, signal)` / `SearchResponse` from Task 2; config cache from Task 3.
- Produces: search results come exclusively from the `findKeys.search(...)` cache; `searchCode` no longer exists (the route handler is the only search entry point).

- [ ] **Step 1: Replace the debounced search effect with a query**

In `apps/web/components/find/find-workspace.tsx`:

1. Update imports: add `keepPreviousData` to the `@tanstack/react-query` import; add `import { fetchSearchResults, type SearchResponse } from '@/lib/find/search-client'`; remove `searchCode` and `type SearchResponse` from the `@/app/find/actions` import.

2. Delete these pieces:
   - `const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null)`
   - `const [isSearchPending, startSearch] = useTransition()`
   - the entire debounced `useEffect` that calls `searchCode` (including its `setSearchResponse` and the `setQueryData` recent-searches update from Task 3 — the recent-searches update moves to step 3 below).

3. Add, after the existing filter state declarations:

```tsx
const [debouncedQuery, setDebouncedQuery] = useState('')

useEffect(() => {
  const timeout = setTimeout(() => setDebouncedQuery(searchQuery), 220)
  return () => clearTimeout(timeout)
}, [searchQuery])

const searchParams: SearchOptions = {
  query: debouncedQuery.trim(),
  mode: searchMode,
  caseSensitive,
  wholeWord,
  extension,
  pathFilter,
  sourceFilter,
  maxResultsPerSource: 50,
}

const searchResult = useQuery({
  queryKey: findKeys.search(searchParams),
  queryFn: ({ signal }) => fetchSearchResults(searchParams, signal),
  enabled: searchParams.query.length > 0,
  placeholderData: keepPreviousData,
})

const searchResponse: SearchResponse | null = searchParams.query
  ? (searchResult.data ?? null)
  : null
const isSearchPending = searchResult.isFetching
```

(`SearchOptions` is already imported as a type from `@/lib/find/search`. Building `searchParams` inline each render is fine — query keys are hashed structurally, so an identical object is the same key. The `AbortSignal` handed to `queryFn` is wired straight into `fetch`, which is what cancels stale keystrokes.)

4. Add the recent-searches cache merge as its own effect (queries must not have side effects in their `queryFn`/render path; v5 has no query `onSuccess`):

```tsx
const latestRecentSearches = searchResult.data?.recentSearches

useEffect(() => {
  if (!latestRecentSearches) {
    return
  }

  queryClient.setQueryData<FindConfig>(findKeys.config(), (current) =>
    current
      ? { ...current, recentSearches: latestRecentSearches }
      : current,
  )
}, [latestRecentSearches, queryClient])
```

5. Add a search error slot in the JSX, directly above the `{isSearchPending ? ...}` spinner block:

```tsx
{searchResult.error ? (
  <div className='rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs'>
    Search failed: {searchResult.error.message}
  </div>
) : null}
```

The rest of the JSX (`searchResponse?.groups.map(...)`, empty states, missing sources, source options) works unchanged because `searchResponse` keeps the same shape and `null` semantics.

- [ ] **Step 2: Delete the searchCode action**

In `apps/web/app/find/actions.ts`, delete the `searchCode` function. Keep the `export type { SearchResponse } ...` re-export only if something still imports it from there; otherwise delete it too, along with the now-unused `executeSearch` and `SearchOptions` imports (check with `pnpm check-types` — after this task nothing should import `SearchResponse` from actions).

- [ ] **Step 3: Verify**

```bash
pnpm check-types
pnpm lint
```

Expected: both pass. With the dev server running, on `/find`:
- Type a query: results appear after the debounce; previous results stay visible while new ones load (`keepPreviousData`).
- Open the browser network tab and type quickly: earlier `/api/find/search` requests show as **(canceled)**.
- Clear the input: results disappear (query disabled).
- Re-run a just-used search from the "Recent:" chips: results render instantly from cache (no new network request within 30s).
- Recent chips update after each new search.
- Stop a query mid-word and check devtools: `['find', 'search', {...}]` entries exist per parameter combination.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/find/find-workspace.tsx apps/web/app/find/actions.ts
git commit -m "feat(find): migrate search to useQuery with abortable route handler fetches"
```

---

### Task 5: Writes through useMutation

**Files:**
- Modify: `apps/web/app/find/actions.ts` (change `addLocalRoot` signature)
- Modify: `apps/web/components/find/find-workspace.tsx` (five mutations; drop `useActionState`/`useTransition`)

**Interfaces:**
- Consumes: `findKeys` from Task 2; config cache from Task 3; existing actions `removeLocalRoot(id: string)`, `lookupGitHubRepos(owner: string): Promise<GitHubLookupResult>`, `setGitHubRepoSelection(repo, selected): Promise<void>`, `syncSelectedGitHubRepos(): Promise<SyncResult[]>`.
- Produces: `addLocalRoot(formData: FormData): Promise<SourceActionState>` (state parameter removed); all pending UI driven by `mutation.isPending`.

- [ ] **Step 1: Simplify the addLocalRoot action signature**

In `apps/web/app/find/actions.ts`, `addLocalRoot` currently takes `(_state: SourceActionState, formData: FormData)` for `useActionState`. Change it to:

```ts
export async function addLocalRoot(
  formData: FormData,
): Promise<SourceActionState> {
```

(body unchanged).

- [ ] **Step 2: Convert the five write flows in the workspace**

In `apps/web/components/find/find-workspace.tsx`:

1. Update imports: add `useMutation` to the `@tanstack/react-query` import; remove `useActionState` and `useTransition` from the `react` import (keep `useEffect`, `useMemo`, `useState`).

2. Delete these declarations:

```tsx
const [sourceState, sourceAction, sourcePending] = useActionState(
  addLocalRoot,
  initialSourceState,
)
const [isRepoLookupPending, startRepoLookup] = useTransition()
const [isRepoSelectionPending, startRepoSelection] = useTransition()
const [isSyncPending, startSync] = useTransition()
const [isRemovingLocalRoot, startLocalRootRemove] = useTransition()
```

Also delete the now-unused `const initialSourceState: SourceActionState = {}` at module scope, and remove `type SourceActionState` from the actions import if nothing else references it after this step.

3. Add the mutations after the `configQuery` declaration:

```tsx
const addLocalRootMutation = useMutation({
  mutationFn: (formData: FormData) => addLocalRoot(formData),
  onSuccess: async (result) => {
    if (!result.error) {
      await queryClient.invalidateQueries({ queryKey: findKeys.config() })
    }
  },
})

const removeLocalRootMutation = useMutation({
  mutationFn: (id: string) => removeLocalRoot(id),
  onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: findKeys.config() })
    await queryClient.invalidateQueries({ queryKey: findKeys.searches() })
  },
})

const repoLookupMutation = useMutation({
  mutationFn: (owner: string) => lookupGitHubRepos(owner),
  onSuccess: (result) => {
    if (result.status !== 'ok') {
      if (result.status === 'rate-limited') {
        setRepoLookupError(
          result.resetAt
            ? `Rate limited until ${new Date(result.resetAt).toLocaleTimeString()}.`
            : 'Rate limited by GitHub. Try again soon.',
        )
      } else {
        setRepoLookupError(result.message ?? 'Could not load repositories.')
      }
      setRepoResults([])
      return
    }

    setRepoLookupError(null)
    setRepoResults(result.repos)
  },
})

const repoSelectionMutation = useMutation({
  mutationFn: ({
    repo,
    selected,
  }: {
    repo: { id: string; owner: string; repo: string }
    selected: boolean
  }) => setGitHubRepoSelection(repo, selected),
  onSuccess: async (_data, { repo, selected }) => {
    setRepoResults((current) =>
      current.map((item) =>
        item.id === repo.id ? { ...item, selected } : item,
      ),
    )
    await queryClient.invalidateQueries({ queryKey: findKeys.config() })
  },
})

const syncMutation = useMutation({
  mutationFn: () => syncSelectedGitHubRepos(),
  onSuccess: async (results) => {
    setSyncMessages(
      Object.fromEntries(
        results.map((result) => [
          result.id,
          result.ok ? 'Synced' : `Failed: ${result.message}`,
        ]),
      ),
    )
    await queryClient.invalidateQueries({ queryKey: findKeys.config() })
    await queryClient.invalidateQueries({ queryKey: findKeys.searches() })
  },
})
```

(`removeLocalRootMutation` and `syncMutation` also invalidate the search scope per the spec: cached results may reference removed or freshly-synced sources.)

4. Rewire the JSX:

   a. **Add-local-root form** — replace `<form action={sourceAction} ...>` with a submit handler, and the pending/error reads:

```tsx
<form
  onSubmit={(event) => {
    event.preventDefault()
    const form = event.currentTarget
    addLocalRootMutation.mutate(new FormData(form), {
      onSuccess: (result) => {
        if (!result.error) {
          form.reset()
        }
      },
    })
  }}
  className='grid gap-3'
>
```

Replace `{sourceState.error ? <FieldError>{sourceState.error}</FieldError> : null}` with:

```tsx
{addLocalRootMutation.data?.error ? (
  <FieldError>{addLocalRootMutation.data.error}</FieldError>
) : null}
```

Replace the submit button's `disabled={sourcePending}` / label with `addLocalRootMutation.isPending`.

   b. **Remove local root button** — replace the `startLocalRootRemove(async () => { ... })` click handler with:

```tsx
onClick={() => removeLocalRootMutation.mutate(root.id)}
```

and `disabled={isRemovingLocalRoot}` with `disabled={removeLocalRootMutation.isPending}`.

   c. **Load repositories button** — replace the `startRepoLookup(async () => { ... })` handler with:

```tsx
onClick={() => {
  setRepoLookupError(null)
  repoLookupMutation.mutate(repoOwner)
}}
```

and `disabled={isRepoLookupPending}` / label with `repoLookupMutation.isPending`.

   d. **Repo selection checkbox** — replace the `startRepoSelection(async () => { ... })` change handler with:

```tsx
onChange={(event) =>
  repoSelectionMutation.mutate({
    repo: { id: repo.id, owner: repo.owner, repo: repo.repo },
    selected: event.target.checked,
  })
}
```

and `disabled={isRepoSelectionPending}` with `disabled={repoSelectionMutation.isPending}`.

   e. **Sync button** — replace the `startSync(async () => { ... })` handler with:

```tsx
onClick={() => syncMutation.mutate()}
```

and both `isSyncPending` reads with `syncMutation.isPending`.

- [ ] **Step 3: Verify**

```bash
pnpm check-types
pnpm lint
```

Expected: both pass, with no remaining references to `useActionState`, `useTransition`, `sourceState`, or `startSearch` in the workspace. With the dev server running, on `/find`:
- Add a valid local folder: button shows "Adding...", the list refreshes, the input clears.
- Add an unreadable path (e.g. `/nonexistent-xyz`): the field error renders, config unchanged.
- Remove a local root: row disappears after invalidation.
- Load repositories for a GitHub user, toggle a repo on and off: the mirror-sync card updates both times.
- Sync selected repositories: per-repo "Synced"/"Failed: ..." messages appear.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/find/actions.ts apps/web/components/find/find-workspace.tsx
git commit -m "feat(find): convert code finder writes to useMutation with cache invalidation"
```

---

### Task 6: Cleanup and full verification

**Files:**
- Modify: `apps/web/app/find/actions.ts` (dead code only, if any remains)

**Interfaces:**
- Consumes: everything above.
- Produces: a clean build; the finished feature.

- [ ] **Step 1: Sweep for dead code**

In `apps/web/app/find/actions.ts`, confirm and remove if still present: the `SearchResponse` type re-export (nothing should import it from actions anymore), unused imports flagged by Biome, and the pre-existing commented-out `syncStatusMessage` / `formatRepoSyncStatus` blocks at lines 107-117 and 406-410 (they reference nothing current). Run:

```bash
pnpm lint:fix
```

- [ ] **Step 2: Full verification**

```bash
pnpm check-types
pnpm lint
pnpm build
```

Expected: all three pass. Then run the spec's manual checklist against `pnpm --filter web dev`:

1. `/find` loads with config populated server-side, no empty flash.
2. Fast typing cancels in-flight search requests (network tab shows canceled requests); results never arrive out of order.
3. Repeating a recent search within 30s resolves instantly from cache.
4. Add, remove, and sync sources refresh the source list without a page reload.
5. Recent searches update after each search.
6. Devtools panel shows `['find', 'config']` and `['find', 'search', {...}]` keys.
7. The Git viewer (`/git`) and home page are unaffected.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore(find): remove dead search action code after query migration"
```
