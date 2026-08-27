# Electron Desktop Ask Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold `apps/desktop` as an Electron + Next.js AI harness, move Ask and local Find into it with SQLite + in-process runner + SSE, and remove Ask/Find from `apps/web`.

**Architecture:** Electron main starts Next on port 3002 and opens a BrowserWindow. Next hosts Ask/Find UI and server procedures. Harness core owns turn runs, a tool registry (`search_local`), and an in-memory SSE event bus. Threads/turns live in `~/.crispy-code/ask.sqlite` via `node:sqlite`. Find config stays at `~/.crispy-code/config.json` (local roots only).

**Tech Stack:** Electron, Next.js 16 (App Router), oRPC, TanStack Query, AI SDK + `@ai-sdk/google`, `node:sqlite`, Zod, `@repo/ui`, Biome, pnpm/turbo.

## Global Constraints

- Domain names from `CONTEXT.md`: AskThread, AskTurn, Question, Answer, Thinking, Search Progress, Evidence — not chat/session/message as entity names.
- No Better Auth, `@repo/db`, `@repo/jobs`, or `@repo/email` in desktop.
- No Inngest; Ask runner is in-process; streaming is local SSE only.
- No GitHub Find/sources/mirrors on desktop or web after this work.
- `GEMINI_API_KEY` optional at boot; Ask banners and blocks submit when missing; pass key via `createGoogle({ apiKey })` (not `GOOGLE_GENERATIVE_AI_API_KEY`).
- Gemini model id stays `gemini-3.5-flash` (match current web Ask).
- Config writes: temp file + rename. SQLite path: `~/.crispy-code/ask.sqlite`.
- Concurrent follow-up on a `RUNNING` turn: reject with a clear error.
- No new test runner. Verification = `pnpm --filter desktop check-types`, `pnpm --filter web check-types`, plus the manual checklist in Task 8.
- Read Next docs under `apps/desktop/node_modules/next/dist/docs/` (or web’s) before novel Next APIs.
- Leave unused `ask_*` Prisma tables in `@repo/db`; do not migrate them away in this plan.

## File map

**Create — `apps/desktop` scaffold**

- `apps/desktop/package.json`
- `apps/desktop/tsconfig.json`
- `apps/desktop/biome.json`
- `apps/desktop/next.config.ts`
- `apps/desktop/postcss.config.mjs`
- `apps/desktop/components.json`
- `apps/desktop/electron/main.mjs`
- `apps/desktop/electron/preload.mjs`
- `apps/desktop/scripts/dev.mjs`
- `apps/desktop/app/layout.tsx`, `app/page.tsx`, `app/providers.tsx`
- `apps/desktop/app/ask/layout.tsx`, `app/ask/page.tsx`, `app/ask/[threadId]/page.tsx`, `app/ask/[threadId]/loading.tsx`
- `apps/desktop/app/find/page.tsx`, `app/find/layout.tsx`, `app/find/file/page.tsx`, `app/find/file/loading.tsx`
- `apps/desktop/app/rpc/[[...rest]]/route.ts`
- `apps/desktop/app/api/ask/turn-events/route.ts` — SSE
- `apps/desktop/lib/env.ts`
- `apps/desktop/lib/fs.ts` (port needed helpers from web)
- `apps/desktop/lib/schemas.ts` (`resilientArray`, `successResponseSchema`)
- `apps/desktop/lib/orpc/{base,context,router,client,client.server}.ts`
- `apps/desktop/lib/harness-db/{schema.sql,client.ts,threads.ts,turns.ts}`
- `apps/desktop/features/harness/{types.ts,events.ts,tools.ts,runner.ts}`
- `apps/desktop/features/find/**` — local-only port
- `apps/desktop/features/ask/**` — adapted port (no auth/Inngest)
- `apps/desktop/components/**` — copied web helpers Ask/Find need (tooltip, code-block, etc.)
- `apps/desktop/.env.example`

**Modify — web cleanup**

- Delete `apps/web/features/ask/**`, `apps/web/features/find/**`
- Delete `apps/web/app/ask/**`, `apps/web/app/(main)/find/**`
- Modify `apps/web/app/api/inngest/route.ts` — drop `askRunFn`
- Modify `apps/web/data/routes.ts` — remove find/ask nav
- Delete or gut `apps/web/proxy.ts` (Ask-only matcher)
- Empty/remove web oRPC ask+find wiring (`lib/orpc/router.ts` and unused rpc stack if nothing remains)
- Modify `README.md` — desktop Ask/Find docs; remove web Ask/Find sections
- Modify `CONTEXT.md` only if wording still says Ask is web-only (keep domain terms)

---

### Task 1: Scaffold `apps/desktop` Next app + Electron shell

**Files:**
- Create: `apps/desktop/package.json`, `tsconfig.json`, `biome.json`, `next.config.ts`, `postcss.config.mjs`, `components.json`
- Create: `apps/desktop/app/layout.tsx`, `app/page.tsx`, `app/providers.tsx`, `components/theme-provider.tsx`
- Create: `apps/desktop/electron/main.mjs`, `electron/preload.mjs`, `scripts/dev.mjs`
- Create: `apps/desktop/.env.example`
- Test: none (typecheck + boot)

**Interfaces:**
- Consumes: showcase patterns; `@repo/ui`; catalog `next`/`react`
- Produces: package name `desktop`; Next on `http://127.0.0.1:3002`; `pnpm --filter desktop dev` starts Next then Electron

- [ ] **Step 1: Create `apps/desktop/package.json`**

```json
{
  "name": "desktop",
  "version": "0.0.1",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "node ./scripts/dev.mjs",
    "dev:next": "next dev -p 3002 -H 127.0.0.1",
    "build": "next build",
    "start": "next start -p 3002 -H 127.0.0.1",
    "check-types": "tsc --noEmit"
  },
  "dependencies": {
    "@ai-sdk/google": "catalog:",
    "@orpc/client": "^1.14.13",
    "@orpc/server": "^1.14.13",
    "@orpc/tanstack-query": "^1.14.13",
    "@repo/ui": "workspace:*",
    "@tanstack/react-query": "^5.101.4",
    "ai": "catalog:",
    "lucide-react": "catalog:",
    "next": "catalog:",
    "next-themes": "catalog:",
    "nuqs": "^2.9.4",
    "react": "catalog:",
    "react-dom": "catalog:",
    "server-only": "catalog:",
    "zod": "catalog:"
  },
  "devDependencies": {
    "@repo/biome-config": "workspace:*",
    "@repo/typescript-config": "workspace:*",
    "@tailwindcss/postcss": "catalog:",
    "@types/node": "catalog:",
    "@types/react": "catalog:",
    "@types/react-dom": "catalog:",
    "electron": "^37.2.0",
    "typescript": "catalog:"
  }
}
```

Match `@orpc/*` and `@tanstack/react-query` / `nuqs` versions to `apps/web/package.json` if they differ when you implement.

- [ ] **Step 2: Add tsconfig / biome / next / postcss / components.json**

Copy from `apps/showcase` and adjust:

- `tsconfig.json` — same path aliases as showcase (`@/*`, `@repo/ui/*`)
- `biome.json` — same extends as showcase
- `postcss.config.mjs` — `export { default } from '@repo/ui/postcss.config'`
- `next.config.ts`:

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@repo/ui'],
  typedRoutes: true,
  devIndicators: false,
  agentRules: false,
}

export default nextConfig
```

- `components.json` — same aliases as showcase, pointing at `@repo/ui`

- [ ] **Step 3: Minimal Next shell**

`app/layout.tsx` — import `@repo/ui/globals.css`, fonts, `ThemeProvider`, wrap `Providers`.

`app/page.tsx`:

```tsx
import { redirect } from 'next/navigation'

export default function HomePage() {
  redirect('/ask')
}
```

`app/providers.tsx` — `QueryClientProvider` + `NuqsAdapter` (copy pattern from `apps/web/app/providers.tsx`, omit auth session provider).

`components/theme-provider.tsx` — copy from showcase.

Temporary stub so Next boots before Ask routes exist:

```tsx
// apps/desktop/app/ask/page.tsx
export default function AskHomePage() {
  return <main className="p-6">Ask (desktop scaffold)</main>
}
```

- [ ] **Step 4: Electron main + preload**

`electron/preload.mjs`:

```js
import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('crispyDesktop', {
  platform: process.platform,
})
```

`electron/main.mjs`:

```js
import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEV_URL = process.env.DESKTOP_URL ?? 'http://127.0.0.1:3002'

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  await win.loadURL(DEV_URL)
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

- [ ] **Step 5: `scripts/dev.mjs`**

Start `next dev`, wait until `http://127.0.0.1:3002` responds, then spawn `electron` with `electron/main.mjs`. On Electron exit, kill Next. Use Node `http.get` poll (no extra deps). Set `ELECTRON_DISABLE_SECURITY_WARNINGS=1` optional for dev.

- [ ] **Step 6: Env example + install**

`apps/desktop/.env.example`:

```bash
GEMINI_API_KEY=
```

Run from repo root:

```bash
pnpm install
pnpm --filter desktop check-types
```

Expected: typecheck passes (stub Ask page).

- [ ] **Step 7: Commit**

```bash
git add apps/desktop pnpm-lock.yaml
git commit -m "feat(desktop): scaffold Electron + Next app shell"
```

---

### Task 2: Desktop foundations (env, fs, oRPC)

**Files:**
- Create: `apps/desktop/lib/env.ts`, `lib/fs.ts`, `lib/schemas.ts`
- Create: `apps/desktop/lib/orpc/base.ts`, `context.ts`, `router.ts`, `client.ts`, `client.server.ts`
- Create: `apps/desktop/app/rpc/[[...rest]]/route.ts`
- Modify: stub router empty until Find/Ask land

**Interfaces:**
- Consumes: `@t3-oss/env-core` only if already used without pulling web’s full `@repo/env` — prefer a tiny local `lib/env.ts` that reads `process.env.GEMINI_API_KEY` without requiring DB/auth.
- Produces: `env.GEMINI_API_KEY?: string`; `base` oRPC builder; `OrpcContext = { headers: Headers }`; `appRouter` object; `/rpc` handler

- [ ] **Step 1: `lib/env.ts`**

```ts
import { z } from 'zod/v4'

const schema = z.object({
  GEMINI_API_KEY: z.string().min(1).optional(),
})

export const env = schema.parse({
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || undefined,
})
```

Do **not** import `@repo/env/server` (it requires DATABASE_URL / auth / Resend).

- [ ] **Step 2: Port `lib/schemas.ts` and `lib/fs.ts`**

Copy `resilientArray` + `successResponseSchema` from `apps/web/lib/schemas/index.ts` (and `formatIssues` helper if `getParsedJsonFileData` needs it).

Copy from `apps/web/lib/fs.ts` at least: `pathExists`, `ensureDir`, `isReadableDir`, `normalizeLocalPath`, `resolveUnderRoot`, `getParsedJsonFileData`, plus any helpers Find search uses. Drop Git-only helpers if present.

- [ ] **Step 3: oRPC base/context/router/clients**

`lib/orpc/context.ts`:

```ts
export type OrpcContext = {
  headers: Headers
}
```

`lib/orpc/base.ts` — same error map and cross-site guard as `apps/web/lib/orpc/base.ts`, but `$context<OrpcContext>()` with no user/session.

`lib/orpc/router.ts`:

```ts
export const appRouter = {}
export type AppRouter = typeof appRouter
```

`client.ts` / `client.server.ts` — copy web patterns without auth; keep `createTanstackQueryUtils(client)` (ask refetchInterval added in Task 6).

`app/rpc/[[...rest]]/route.ts` — like web but context is only `{ headers }`. No `auth.api.getSession`. Logging: use `console.error` or skip `@repo/observability` if it pulls unwanted deps; prefer plain `console.error` for MVP.

- [ ] **Step 4: Typecheck + commit**

```bash
pnpm --filter desktop check-types
git add apps/desktop
git commit -m "feat(desktop): add env, fs helpers, and oRPC foundation"
```

---

### Task 3: Harness SQLite (`lib/harness-db`)

**Files:**
- Create: `apps/desktop/lib/harness-db/schema.sql`
- Create: `apps/desktop/lib/harness-db/client.ts`
- Create: `apps/desktop/lib/harness-db/threads.ts`
- Create: `apps/desktop/lib/harness-db/turns.ts`

**Interfaces:**
- Consumes: `node:sqlite` `DatabaseSync`; `FIND_HOME` path (`~/.crispy-code`)
- Produces:
  - `getDb(): DatabaseSync`
  - `createThread({ title }): { id, title, createdAt, updatedAt }`
  - `listThreads(): Array<{ id, title, updatedAt, createdAt }>` ordered by `updatedAt` desc
  - `getThread(id): { id, title, createdAt, updatedAt, turns: TurnRow[] } | null`
  - `deleteThread(id): boolean`
  - `renameThread(id, title): boolean` — must **not** bump `updatedAt`
  - `createTurn({ threadId, question }): TurnRow` status `RUNNING`, stage `PLANNING`
  - `updateTurn(id, patch)`
  - `getTurn(id): TurnRow | null`
  - `threadHasRunningTurn(threadId): boolean`

`TurnRow` fields (mirror Prisma AskTurn minus user/inngest):

```ts
type TurnRow = {
  id: string
  threadId: string
  question: string
  answer: string | null
  intent: string | null
  plannedQueries: unknown | null
  usedFallbackPlan: number // 0|1
  groups: unknown | null
  totalMatches: number | null
  missingSources: unknown | null
  searchStage: 'PLANNING' | 'SEARCHING' | 'WRITING' | null
  status: 'RUNNING' | 'COMPLETED' | 'FAILED'
  error: string | null
  createdAt: string
}
```

- [ ] **Step 1: Schema + client**

`schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS ask_thread (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS ask_thread_updated_at_idx
  ON ask_thread (updated_at DESC);

CREATE TABLE IF NOT EXISTS ask_turn (
  id TEXT PRIMARY KEY NOT NULL,
  thread_id TEXT NOT NULL REFERENCES ask_thread(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT,
  intent TEXT,
  planned_queries TEXT,
  used_fallback_plan INTEGER NOT NULL DEFAULT 0,
  groups TEXT,
  total_matches INTEGER,
  missing_sources TEXT,
  search_stage TEXT,
  status TEXT NOT NULL,
  error TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS ask_turn_thread_created_idx
  ON ask_turn (thread_id, created_at);
```

`client.ts` — open `path.join(os.homedir(), '.crispy-code', 'ask.sqlite')`, `ensureDir`, `db.exec(schema)`, singleton.

Generate ids with `crypto.randomUUID()` (or cuid-compatible string). Timestamps: `new Date().toISOString()`.

- [ ] **Step 2: threads.ts + turns.ts**

Implement the interface list above. JSON columns store `JSON.stringify` / `JSON.parse`. `renameThread` runs `UPDATE ask_thread SET title = ? WHERE id = ?` without touching `updated_at`. Creating a turn bumps the parent thread’s `updated_at`.

- [ ] **Step 3: Typecheck + commit**

```bash
pnpm --filter desktop check-types
git add apps/desktop/lib/harness-db
git commit -m "feat(desktop): add SQLite harness DB for Ask threads"
```

---

### Task 4: Harness core (events, tools, runner skeleton)

**Files:**
- Create: `apps/desktop/features/harness/types.ts`
- Create: `apps/desktop/features/harness/events.ts`
- Create: `apps/desktop/features/harness/tools.ts`
- Create: `apps/desktop/features/harness/runner.ts`

**Interfaces:**
- Consumes: harness-db turn APIs (Task 3); tool implementations registered later
- Produces:
  - `HarnessEvent` union: `{ type: 'stage', stage } | { type: 'token', kind: 'thinking'|'answer', text } | { type: 'done' } | { type: 'error', message }`
  - `subscribeTurnEvents(turnId, listener): () => void`
  - `publishTurnEvent(turnId, event): void`
  - `registerTool({ name, description, execute })` / `getTool(name)` / `listTools()`
  - `runAskTurn({ threadId, turnId, question, history }): Promise<void>` — full pipeline implemented in Task 6. This task ships events + tools + a runner shell that throws `runAskTurn not implemented` if called early.

- [ ] **Step 1: events.ts**

In-memory `Map<string, Set<listener>>`. `publishTurnEvent` invokes listeners; errors in listeners must not break the publisher.

- [ ] **Step 2: tools.ts**

```ts
export type HarnessTool<TInput, TOutput> = {
  name: string
  description: string
  execute: (input: TInput) => Promise<TOutput>
}

const tools = new Map<string, HarnessTool<unknown, unknown>>()

export function registerTool<TInput, TOutput>(
  tool: HarnessTool<TInput, TOutput>,
): void {
  tools.set(tool.name, tool as HarnessTool<unknown, unknown>)
}

export function getTool(name: string): HarnessTool<unknown, unknown> {
  const tool = tools.get(name)
  if (!tool) throw new Error(`Unknown harness tool: ${name}`)
  return tool
}
```

- [ ] **Step 3: runner.ts shell**

```ts
export async function runAskTurn(_input: {
  threadId: string
  turnId: string
  question: string
  history: Array<{ question: string; answer: string }>
}): Promise<void> {
  throw new Error('runAskTurn not implemented')
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/features/harness
git commit -m "feat(desktop): add harness events, tools, runner shell"
```

---

### Task 5: Port local Find into desktop

**Files:**
- Create: `apps/desktop/features/find/**` (local-only)
- Create: `apps/desktop/app/find/**`
- Copy needed web components into `apps/desktop/components/` (tooltip, search-query-inputs, code-block, copy-button, file, file-icon, file-image-preview, hex-dump as required by hit list / file page)
- Copy highlighter helpers Find needs into `apps/desktop/lib/`
- Modify: `apps/desktop/lib/orpc/router.ts` — mount `find: findRouter`
- Create: `apps/desktop/hooks/use-debounce.ts` if search-results needs it

**Interfaces:**
- Consumes: `lib/fs`, `lib/schemas`, oRPC `base`
- Produces: `findRouter` with **only** `getConfig`, `search`, `addLocalRoot`, `removeLocalRoot`
- Config schema still accepts `githubRepos` in JSON for backward compatibility with existing `config.json`, but UI and procedures never add/sync GitHub. Default empty `githubRepos: []`.
- `loadLocalSources` / `runLocalSearches` live under Find (`features/find/local-search.ts`). Harness tool `search_local` is registered in Task 6 when Ask schemas exist.

- [ ] **Step 1: Copy local Find core**

Copy and adapt these from web (update imports to `@/` desktop paths):

- `config/data.ts`, `config/schemas.ts`, `config/service.ts` — change `writeFindConfig` to write via temp path + `rename` (atomic)
- `search.ts`, `service.ts`, `cluster-search-lines.ts`, `schemas.ts` (keep hit schemas; drop unused GitHub sync schemas)
- `orpc.ts` — **delete** GitHub procedures (`lookupGitHubRepos`, `setGitHubRepoSelection`, `removeGitHubRepo`, `syncGitHubRepos`)
- Components: `sources-panel.tsx`, `search-results.tsx`, `search-hit-list.tsx`, `search-chrome.tsx`, `config-error-message.tsx`, `sources-sheet.tsx` — remove GitHub tabs; Local-only sheet
- New `local-search.ts` + `cap-evidence.ts` — port from web `features/ask/search-local.ts` and `cap-evidence.ts` so Find owns ripgrep batching for Ask

Do **not** copy: `sync-github-repos.ts`, `sync-eligibility.ts`, `remove-github-repo.ts`, `github-sources-panel.tsx`, `use-sync-github-repos.ts`, `use-auto-sync-github-repos.ts`, `find-auto-sync.tsx`, `sync-status-notice.tsx`.

- [ ] **Step 2: Find routes**

Port `app/find/page.tsx` / layout / file page from web’s `(main)/find`, strip `FindAutoSync` and GitHub chrome. Wire nav between Ask and Find in Ask layout later.

- [ ] **Step 3: Mount router + typecheck**

```ts
import { findRouter } from '@/features/find/orpc'

export const appRouter = {
  find: findRouter,
}
```

```bash
pnpm --filter desktop check-types
```

- [ ] **Step 4: Commit**

```bash
git add apps/desktop
git commit -m "feat(desktop): port local Find search and config"
```

---

### Task 6: Port Ask onto harness (Gemini, oRPC, SSE, UI)

**Files:**
- Create: `apps/desktop/features/ask/**` (adapted)
- Create: `apps/desktop/app/ask/**` (replace stub)
- Create: `apps/desktop/app/api/ask/turn-events/route.ts`
- Modify: `apps/desktop/features/harness/runner.ts` — full pipeline
- Modify: `apps/desktop/lib/orpc/router.ts` — add `ask`
- Modify: `apps/desktop/lib/orpc/client.ts` — RUNNING refetchInterval for `getThread`

**Interfaces:**
- Consumes: harness-db, harness events/tools, `search_local`, `lib/env`
- Produces: `askRouter` procedures `status | start | getThread | listThreads | deleteThread | renameThread` (no `realtimeToken`, no auth checks)
- SSE: `GET /api/ask/turn-events?turnId=` streams NDJSON or `text/event-stream` of `HarnessEvent`
- `useAskTurnStream(turnId)` reads SSE instead of Inngest

- [ ] **Step 1: Port schemas / title / gemini**

Copy `schemas.ts` and `title.ts` from web Ask.

`gemini.ts` changes:

- `import { env } from '@/lib/env'`
- `createGoogle({ apiKey })` with **default `fetch`** (remove `inngestFetch`)
- Keep `planSearch` / `streamWriteAnswer` signatures; `onThinking` / `onAnswer` callbacks publish via harness events in the runner

Evidence capping stays in `features/find/cap-evidence.ts` (ported in Task 5).
- [ ] **Step 2: Register `search_local` and implement `runAskTurn`**

Create `features/find/register-tools.ts`:

```ts
import { registerTool } from '@/features/harness/tools'
import type { PlannedSearch } from '@/features/ask/schemas'
import {
  loadLocalSources,
  runLocalSearches,
} from '@/features/find/local-search'

let registered = false

export function registerFindTools(): void {
  if (registered) return
  registered = true
  registerTool({
    name: 'search_local',
    description: 'Run planned ripgrep searches over configured local folders',
    async execute(input: { searches: PlannedSearch[] }) {
      const sources = await loadLocalSources()
      if (!sources.available.length) {
        return { groups: [], missing: sources.missing, empty: true as const }
      }
      const groups = await runLocalSearches(sources.available, input.searches)
      return { groups, missing: sources.missing, empty: false as const }
    },
  })
}
```

Call `registerFindTools()` at the top of `runAskTurn`.

Mirror web `askRunFn` stages without Inngest steps:

1. `publishTurnEvent` stage PLANNING; if `loadLocalSources().available` is empty, `updateTurn` FAILED with message `No local folders configured for Ask.`, publish error/done, return
2. `planSearch` or fallback plan; persist plan; stage SEARCHING
3. `getTool('search_local').execute({ searches })`; persist groups / missing / totalMatches; stage WRITING
4. `streamWriteAnswer` with callbacks → `publishTurnEvent` token events; throttle-persist answer text like web
5. Mark COMPLETED; publish `done`
6. `try/catch` → FAILED + publish error

- [ ] **Step 3: Ask oRPC**

Port `orpc.ts` with these changes:

- Remove all `context.user` / FORBIDDEN sign-in checks
- Use harness-db instead of `db.askThread` / `db.askTurn`
- `start`: if `threadId` and `threadHasRunningTurn`, throw BAD_REQUEST `"Wait for the current answer before asking again."`
- After creating turn, `void runAskTurn({...})` (fire-and-forget); do not await full completion in the handler
- Drop `realtimeToken` procedure
- `status`: `{ geminiConfigured: isGeminiConfigured() }`
- Rename: do not bump `updatedAt` (harness-db already)

- [ ] **Step 4: SSE route**

`app/api/ask/turn-events/route.ts`:

```ts
import { subscribeTurnEvents } from '@/features/harness/events'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const turnId = new URL(request.url).searchParams.get('turnId')
  if (!turnId) {
    return new Response('turnId required', { status: 400 })
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      const send = (event: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        )
      }
      const unsubscribe = subscribeTurnEvents(turnId, (event) => {
        send(event)
        if (event.type === 'done' || event.type === 'error') {
          unsubscribe()
          controller.close()
        }
      })
      request.signal.addEventListener('abort', () => {
        unsubscribe()
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
```

- [ ] **Step 5: Port Ask UI**

Copy Ask components/hooks/layouts/pages from web.

Adapt:

- `use-ask-turn-stream.ts` — `EventSource(\`/api/ask/turn-events?turnId=${turnId}\`)`; accumulate thinking/answer from token events; clean up on unmount
- `hooks.ts` — `hasLocalRootFolders` from `orpc.find.getConfig` (unchanged idea)
- Remove auth gates / proxy assumptions
- Links to `/find` stay
- Sidebar header controls: simplify (no web auth menu) — keep theme toggle if easy; else minimal header

Mount:

```ts
export const appRouter = {
  find: findRouter,
  ask: askRouter,
}
```

- [ ] **Step 6: Typecheck**

```bash
pnpm --filter desktop check-types
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/desktop
git commit -m "feat(desktop): port Ask onto local harness with SSE"
```

---

### Task 7: Remove Ask and Find from `apps/web`

**Files:**
- Delete: `apps/web/features/ask/**`, `apps/web/features/find/**`
- Delete: `apps/web/app/ask/**`, `apps/web/app/(main)/find/**`
- Modify: `apps/web/app/api/inngest/route.ts`
- Modify: `apps/web/data/routes.ts`
- Delete: `apps/web/proxy.ts` (Ask-only) **or** leave empty export only if Next requires it — delete if unused
- Modify: `apps/web/lib/orpc/router.ts` → empty `{}` **or** delete entire `lib/orpc/**` + `app/rpc/**` + unused orpc/ai deps from `apps/web/package.json` if nothing else uses them
- Modify: `README.md` — document desktop Ask/Find; remove web Ask section
- Optional: trim `@ai-sdk/google` / `ai` from web package.json if unused after Ask removal
- Do **not** drop Prisma ask models

**Interfaces:**
- Consumes: none
- Produces: web builds without Ask/Find; Inngest serves email functions only

- [ ] **Step 1: Inngest route**

```ts
import { emailFunctions } from '@repo/email/functions'
import { inngest } from '@repo/jobs/client'
import { serve } from 'inngest/next'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [...emailFunctions],
})
```

- [ ] **Step 2: Remove nav entries**

In `apps/web/data/routes.ts`, delete the `find` and `ask` objects from `ROOT_NAV`.

- [ ] **Step 3: Delete feature + route trees and Ask proxy**

Delete the directories listed above. Delete `proxy.ts` if its only matcher was `/ask`.

- [ ] **Step 4: Clear oRPC**

If no remaining procedures: delete `apps/web/app/rpc`, `apps/web/lib/orpc`, and remove `@orpc/*` from web dependencies **only if** no other imports remain. Grep before deleting.

Alternatively keep an empty `appRouter = {}` and rpc route for later — prefer **delete** dead stack (YAGNI).

- [ ] **Step 5: README**

Replace the “Ask (`/ask`)” section with desktop instructions:

- `pnpm --filter desktop dev`
- `GEMINI_API_KEY` in `apps/desktop/.env.local`
- Find/Ask live in the desktop app; web no longer hosts them

- [ ] **Step 6: Typecheck both apps**

```bash
pnpm --filter web check-types
pnpm --filter desktop check-types
```

Expected: both PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(web): remove Ask and Find; desktop is the home"
```

---

### Task 8: Manual verification + PR polish

**Files:**
- Modify: PR description / README tweaks if gaps found during verification

**Interfaces:** none new

- [ ] **Step 1: Desktop boot**

```bash
pnpm --filter desktop dev
```

Expected: Next listens on `127.0.0.1:3002`; Electron window loads (skip Electron in headless CI — verify Next + curl instead).

- [ ] **Step 2: Find checklist**

1. Open `/find`
2. Add a local folder
3. Search a known symbol
4. Confirm hits and file open works

- [ ] **Step 3: Ask checklist**

1. Set `GEMINI_API_KEY` in `apps/desktop/.env.local`
2. Ask a question on `/ask`
3. Observe planning → searching → writing
4. Reload — Evidence + Answer persist
5. Follow-up on same thread
6. Rename + delete in history

- [ ] **Step 4: Web checklist**

1. `/ask` and `/find` are gone (404)
2. Root nav has no Ask/Find
3. Auth / git / email paths still typecheck

- [ ] **Step 5: Final commit if fixes needed**

```bash
git add -A
git commit -m "fix(desktop): address verification gaps"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
| --- | --- |
| Electron + Next `apps/desktop` | 1 |
| Harness-oriented layout | 4 (+ Ask/Find on top in 5–6) |
| SQLite AskThread/AskTurn | 3 |
| `config.json` local folders | 5 |
| In-process Ask runner | 6 |
| SSE streaming | 6 |
| `search_local` tool | 6 (Find helpers in 5) |
| No auth / Inngest / Postgres on desktop | 1–6 |
| Remove Ask/Find from web | 7 |
| Manual MVP verification | 8 |
| Leave Prisma ask tables | 7 |
| Atomic config write | 5 |
| Concurrent RUNNING guard | 6 |
| Gemini banner when key missing | 6 (ported status UI) |
