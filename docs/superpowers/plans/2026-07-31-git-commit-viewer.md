# Git Commit Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user enter a public GitHub repository under `/git` and browse its commits, rendering each commit's per-file diff through the existing `CodeBlock` component.

**Architecture:** Three URL-driven screens under `apps/web/app/git`. Pure functions handle patch parsing and input parsing; a thin client wraps the GitHub REST API and returns a discriminated result instead of throwing; cached async functions carrying `'use cache'` supply data to pages. Because `cacheComponents: true` is enabled, pages stay synchronous and pass the `params` promise down to async children inside `<Suspense>`.

**Tech Stack:** Next.js 16.2.6 (App Router, Cache Components, typed routes), React 19.2.4, `@tanstack/highlight` 0.0.9, `@repo/ui` (shadcn/base-ui), Tailwind CSS 4, Biome, pnpm + Turborepo.

**Spec:** `docs/superpowers/specs/2026-07-31-git-commit-viewer-design.md`

## Global Constraints

- No test runner is added. Verification is `pnpm check-types`, `pnpm lint`, throwaway `node` scripts for pure modules, and manual browser checks.
- Data source is the unauthenticated GitHub REST API against public repositories. `GITHUB_TOKEN` is read from env if present but is never required.
- No database, no session, no cookies. Repository identity lives only in the URL.
- `cacheComponents: true` is set in `apps/web/next.config.ts`. Any component awaiting `params` or `searchParams` MUST be inside a `<Suspense>` boundary, or the build fails with a blocking-route error.
- The removed route segment configs `dynamic`, `revalidate`, and `fetchCache` MUST NOT be used. Caching is expressed only via `'use cache'`, `cacheLife`, and `cacheTag`.
- `cacheLife` for a non-`ok` result MUST be `'seconds'` so transient failures are not cached long.
- `error.tsx` props in this Next.js version are `{ error, unstable_retry }`, not `{ error, reset }`.
- Runtime-built hrefs MUST be cast `as Route` (`import type { Route } from 'next'`) to satisfy typed routes.
- Biome formatting: single quotes, JSX single quotes, no semicolons, 2-space indent. `noExplicitAny` is an error.
- TypeScript has `noUncheckedIndexedAccess: true`. Every array index access yields `T | undefined` and MUST be narrowed before use.
- Import alias `@/*` maps to `apps/web/*`. UI imports use `@repo/ui/components/<name>`.
- Run all commands from the repo root, `/Users/brandoncrisp/Projects/crispy-code`.

---

### Task 1: Language registration and filename mapping

The highlighter currently knows only `html`, `css`, and `tsx`. Commit diffs touch
arbitrary file types, so it must know every language the package ships and fall
back to plain text otherwise.

**Files:**
- Modify: `apps/web/lib/highlight.ts`
- Create: `apps/web/lib/diff/language-for-filename.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `languageForFilename(path: string): string` — returns a language name
  registered on the highlighter, defaulting to `'plaintext'`. Task 6 uses it.

- [ ] **Step 1: Replace the highlighter language set**

Overwrite `apps/web/lib/highlight.ts`. Keep the `highlightCss` export exactly as
it is; only the `createHighlighter` call changes.

```ts
import { createHighlighter } from '@tanstack/highlight/core'
import { apache } from '@tanstack/highlight/languages/apache'
import { css } from '@tanstack/highlight/languages/css'
import { diff } from '@tanstack/highlight/languages/diff'
import { dockerfile } from '@tanstack/highlight/languages/dockerfile'
import { ejs } from '@tanstack/highlight/languages/ejs'
import { env } from '@tanstack/highlight/languages/env'
import { html } from '@tanstack/highlight/languages/html'
import { http } from '@tanstack/highlight/languages/http'
import { js } from '@tanstack/highlight/languages/js'
import { json } from '@tanstack/highlight/languages/json'
import { jsx } from '@tanstack/highlight/languages/jsx'
import { markdown } from '@tanstack/highlight/languages/markdown'
import { mermaid } from '@tanstack/highlight/languages/mermaid'
import { nginx } from '@tanstack/highlight/languages/nginx'
import { plaintext } from '@tanstack/highlight/languages/plaintext'
import { python } from '@tanstack/highlight/languages/python'
import { scheme } from '@tanstack/highlight/languages/scheme'
import { shell } from '@tanstack/highlight/languages/shell'
import { sql } from '@tanstack/highlight/languages/sql'
import { svelte } from '@tanstack/highlight/languages/svelte'
import { toml } from '@tanstack/highlight/languages/toml'
import { ts } from '@tanstack/highlight/languages/ts'
import { tsx } from '@tanstack/highlight/languages/tsx'
import { createThemeCss } from '@tanstack/highlight/theme'
import { githubDarkTheme } from '@tanstack/highlight/themes/github-dark'
import { githubLightTheme } from '@tanstack/highlight/themes/github-light'
import { vue } from '@tanstack/highlight/languages/vue'
import { yaml } from '@tanstack/highlight/languages/yaml'

export const highlighter = createHighlighter({
  fallbackLanguage: 'plaintext',
  languages: [
    apache,
    css,
    diff,
    dockerfile,
    ejs,
    env,
    html,
    http,
    js,
    json,
    jsx,
    markdown,
    mermaid,
    nginx,
    plaintext,
    python,
    scheme,
    shell,
    sql,
    svelte,
    toml,
    ts,
    tsx,
    vue,
    yaml,
  ],
})

export const highlightCss = createThemeCss({
  light: githubLightTheme,
  dark: githubDarkTheme,
})
```

Note: `tsrx` is deliberately omitted; it is a TanStack-specific dialect that no
GitHub file extension maps to. Run `pnpm lint:fix` afterwards to let Biome sort
the imports rather than hand-ordering them.

- [ ] **Step 2: Verify every import resolves and the languages register**

Node 22.19 strips TypeScript types natively, so `.ts` files run directly. Use a
scratch file rather than `node -e`, because relative dynamic imports inside `-e`
have no reliable base URL.

```bash
cat > /tmp/check-highlight.mjs <<'EOF'
const base = `file://${process.cwd()}/`
const { highlighter } = await import(new URL('./apps/web/lib/highlight.ts', base))

console.log('count', highlighter.listLanguages().length)
console.log('normalize go ->', highlighter.normalizeLanguage('go'))
console.log('normalize yml ->', highlighter.normalizeLanguage('yml'))
EOF
node /tmp/check-highlight.mjs
```

Expected: `count 25`, `normalize go -> plaintext`, `normalize yml -> yaml`.
Clean up with `rm /tmp/check-highlight.mjs`.

If this fails with a module-resolution error on a language subpath, cross-check
the export name against
`apps/web/node_modules/@tanstack/highlight/skills/configure-selective-highlighting/references/languages.md`.

- [ ] **Step 3: Create the filename-to-language map**

Create `apps/web/lib/diff/language-for-filename.ts`:

```ts
const BY_EXTENSION: Record<string, string> = {
  bash: 'shell',
  cjs: 'js',
  css: 'css',
  diff: 'diff',
  ejs: 'ejs',
  htm: 'html',
  html: 'html',
  http: 'http',
  js: 'js',
  json: 'json',
  json5: 'json',
  jsonc: 'json',
  jsx: 'jsx',
  markdown: 'markdown',
  md: 'markdown',
  mdx: 'markdown',
  mermaid: 'mermaid',
  mjs: 'js',
  mts: 'ts',
  patch: 'diff',
  py: 'python',
  rkt: 'scheme',
  scm: 'scheme',
  sh: 'shell',
  sql: 'sql',
  svelte: 'svelte',
  toml: 'toml',
  ts: 'ts',
  tsx: 'tsx',
  vue: 'vue',
  xml: 'html',
  yaml: 'yaml',
  yml: 'yaml',
  zsh: 'shell',
}

const BY_FILENAME: Record<string, string> = {
  dockerfile: 'dockerfile',
  'nginx.conf': 'nginx',
}

/**
 * Resolves a repository file path to a language registered on the highlighter.
 * Anything unrecognised falls back to plain text, which still renders correctly.
 */
export function languageForFilename(path: string): string {
  const filename = path.split('/').pop()?.toLowerCase() ?? ''

  const byFilename = BY_FILENAME[filename]
  if (byFilename) {
    return byFilename
  }

  // Covers .env, .env.local, .env.production and friends.
  if (filename.startsWith('.env')) {
    return 'env'
  }

  const dot = filename.lastIndexOf('.')

  // A leading dot means a dotfile such as .gitignore, not an extension.
  if (dot <= 0) {
    return 'plaintext'
  }

  return BY_EXTENSION[filename.slice(dot + 1)] ?? 'plaintext'
}
```

- [ ] **Step 4: Verify the mapping against real-world paths**

Run:

```bash
cat > /tmp/check-language.mjs <<'EOF'
const base = `file://${process.cwd()}/`
const { languageForFilename } = await import(
  new URL('./apps/web/lib/diff/language-for-filename.ts', base)
)
const cases = [
  ['apps/web/app/page.tsx', 'tsx'],
  ['packages/ui/src/lib/utils.ts', 'ts'],
  ['pnpm-workspace.yaml', 'yaml'],
  ['package.json', 'json'],
  ['README.md', 'markdown'],
  ['Dockerfile', 'dockerfile'],
  ['.env.local', 'env'],
  ['.gitignore', 'plaintext'],
  ['src/main.go', 'plaintext'],
  ['Makefile', 'plaintext'],
]
let failed = 0
for (const [input, expected] of cases) {
  const actual = languageForFilename(input)
  if (actual !== expected) { failed++; console.log('FAIL', input, 'got', actual, 'want', expected) }
}
console.log(failed === 0 ? 'ALL PASS' : failed + ' FAILED')
EOF
node /tmp/check-language.mjs
```

Expected: `ALL PASS`. Clean up with `rm /tmp/check-language.mjs`.

- [ ] **Step 5: check-types and lint**

Run:

```bash
pnpm check-types && pnpm lint
```

Expected: both succeed with no errors. If `pnpm lint` reports import ordering,
run `pnpm lint:fix` and re-run.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/highlight.ts apps/web/lib/diff/language-for-filename.ts
git commit -m "feat(highlight): register all languages and map filenames to them"
```

---

### Task 2: Unified patch parser

This is the most delicate piece: it converts GitHub's unified diff into code plus
line decorations. The `th-line--inserted` and `th-line--deleted` classes are
already styled in `packages/ui/src/styles/globals.css`, so no CSS is needed.

**Files:**
- Create: `apps/web/lib/diff/parse-patch.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `parsePatch(patch: string): ParsedPatch` where
  `ParsedPatch = { code: string; decorations: HighlightDecoration[] }`. Task 6
  passes `code` and `decorations` straight into
  `createHighlightedCodeBlockProps`.

- [ ] **Step 1: Create the parser**

Create `apps/web/lib/diff/parse-patch.ts`:

```ts
import type { HighlightDecoration } from '@tanstack/highlight/core'

export type ParsedPatch = {
  code: string
  decorations: HighlightDecoration[]
}

type LineClass =
  | 'th-line--deleted'
  | 'th-line--highlighted'
  | 'th-line--inserted'

/**
 * Converts a GitHub unified diff into highlightable source plus per-line
 * decorations. Markers are stripped from the code so the file's real language
 * highlights correctly, and the add/remove signal moves into decorations.
 *
 * Gutter numbers are therefore diff-relative, not true file line numbers.
 */
export function parsePatch(patch: string): ParsedPatch {
  const codeLines: string[] = []
  const lineClasses: Array<LineClass | null> = []

  for (const line of patch.split('\n')) {
    // '\ No newline at end of file' is diff metadata, not file content.
    if (line.startsWith('\\')) {
      continue
    }

    if (line.startsWith('@@')) {
      codeLines.push(line)
      lineClasses.push('th-line--highlighted')
      continue
    }

    if (line.startsWith('+')) {
      codeLines.push(line.slice(1))
      lineClasses.push('th-line--inserted')
      continue
    }

    if (line.startsWith('-')) {
      codeLines.push(line.slice(1))
      lineClasses.push('th-line--deleted')
      continue
    }

    codeLines.push(line.startsWith(' ') ? line.slice(1) : line)
    lineClasses.push(null)
  }

  return {
    code: codeLines.join('\n'),
    decorations: toDecorations(lineClasses),
  }
}

/**
 * Collapses runs of identically classed lines into single range decorations.
 * Line coordinates are one-based and inclusive.
 */
function toDecorations(
  lineClasses: ReadonlyArray<LineClass | null>,
): HighlightDecoration[] {
  const decorations: HighlightDecoration[] = []
  let index = 0

  while (index < lineClasses.length) {
    const className = lineClasses[index]

    if (!className) {
      index += 1
      continue
    }

    let end = index
    while (end + 1 < lineClasses.length && lineClasses[end + 1] === className) {
      end += 1
    }

    decorations.push(
      index === end
        ? { className, lines: index + 1 }
        : { className, lines: [index + 1, end + 1] },
    )

    index = end + 1
  }

  return decorations
}
```

- [ ] **Step 2: Verify against a realistic patch**

Run:

Write the check to a scratch file rather than passing it with `-e`, because the
patch content contains quotes and backslashes that are awkward to escape through
the shell.

```bash
cat > /tmp/check-parse-patch.mjs <<'EOF'
const { parsePatch } = await import(
  new URL('./apps/web/lib/diff/parse-patch.ts', `file://${process.cwd()}/`)
)

const patch = [
  '@@ -1,6 +1,7 @@',
  ' const label = "hello"',
  '-const a = 1',
  '-const b = 2',
  '+const a = 10',
  '+const b = 20',
  '+const c = 30',
  ' ',
  ' export default a',
  '\\ No newline at end of file',
].join('\n')

const result = parsePatch(patch)
console.log(JSON.stringify(result.code.split('\n')))
console.log(JSON.stringify(result.decorations))
EOF
node /tmp/check-parse-patch.mjs
```

Expected exactly these two lines:

```
["@@ -1,6 +1,7 @@","const label = \"hello\"","const a = 1","const b = 2","const a = 10","const b = 20","const c = 30","","export default a"]
[{"className":"th-line--highlighted","lines":1},{"className":"th-line--deleted","lines":[3,4]},{"className":"th-line--inserted","lines":[5,7]}]
```

Clean up afterwards with `rm /tmp/check-parse-patch.mjs`.

Confirm four things in that output: the `+`/`-`/space markers are gone, the
`\ No newline` line is absent, the deleted and inserted runs are merged into
ranges rather than one decoration per line, and the hunk header is line 1.

- [ ] **Step 3: Verify the edge cases**

Run:

```bash
cat > /tmp/check-parse-patch-edges.mjs <<'EOF'
const base = `file://${process.cwd()}/`
const { parsePatch } = await import(new URL('./apps/web/lib/diff/parse-patch.ts', base))

// An added line that is empty: '+' with nothing after it.
console.log('empty add:', JSON.stringify(parsePatch('@@ -0,0 +1,2 @@\n+\n+x').code))
// An empty patch must not crash and must yield no decorations.
console.log('empty patch:', JSON.stringify(parsePatch('')))
EOF
node /tmp/check-parse-patch-edges.mjs
```

Expected:

```
empty add: "@@ -0,0 +1,2 @@\n\nx"
empty patch: {"code":"","decorations":[]}
```

Clean up with `rm /tmp/check-parse-patch-edges.mjs`.

- [ ] **Step 4: check-types and lint**

Run:

```bash
pnpm check-types && pnpm lint
```

Expected: both succeed.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/diff/parse-patch.ts
git commit -m "feat(diff): parse unified patches into code and line decorations"
```

---

### Task 3: GitHub API client

A single choke point for every GitHub request. It returns a discriminated result
rather than throwing so each caller decides what is fatal, which is what makes
the rate-limit UI possible.

**Files:**
- Create: `apps/web/lib/github/types.ts`
- Create: `apps/web/lib/github/client.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `GitHubResult<T>` — union of `{ status: 'ok'; data: T }`,
    `{ status: 'not-found' }`, `{ status: 'rate-limited'; resetAt: Date | null }`,
    `{ status: 'error'; message: string }`.
  - `fetchGitHub<T>(path: string): Promise<GitHubResult<T>>`.
  - Types `GitHubRepo`, `GitHubCommitSummary`, `GitHubCommitFile`,
    `GitHubCommitDetail`.
  - Tasks 5 and 6 consume all of these.

- [ ] **Step 1: Create the response types**

Only the fields the UI reads are modelled. Create `apps/web/lib/github/types.ts`:

```ts
export type GitHubRepo = {
  default_branch: string
  description: string | null
  full_name: string
  html_url: string
  stargazers_count: number
}

export type GitHubCommitSummary = {
  author: { avatar_url: string; login: string } | null
  commit: {
    author: { date: string; name: string } | null
    message: string
  }
  html_url: string
  sha: string
}

export type GitHubCommitFileStatus =
  | 'added'
  | 'changed'
  | 'copied'
  | 'modified'
  | 'removed'
  | 'renamed'
  | 'unchanged'

export type GitHubCommitFile = {
  additions: number
  deletions: number
  filename: string
  /** Absent for binary files and for diffs GitHub considers too large. */
  patch?: string
  previous_filename?: string
  status: GitHubCommitFileStatus
}

export type GitHubCommitDetail = GitHubCommitSummary & {
  files?: GitHubCommitFile[]
  stats?: { additions: number; deletions: number; total: number }
}
```

- [ ] **Step 2: Create the client**

Create `apps/web/lib/github/client.ts`:

```ts
export type GitHubResult<T> =
  | { status: 'error'; message: string }
  | { status: 'not-found' }
  | { status: 'ok'; data: T }
  | { status: 'rate-limited'; resetAt: Date | null }

const API_BASE = 'https://api.github.com'

function resetAtFrom(headers: Headers): Date | null {
  const reset = headers.get('x-ratelimit-reset')

  if (!reset) {
    return null
  }

  const epochSeconds = Number(reset)

  return Number.isFinite(epochSeconds) ? new Date(epochSeconds * 1000) : null
}

/**
 * Single entry point for GitHub REST calls. Never throws: callers inspect
 * `status` so that expected conditions such as rate limiting can render as UI
 * instead of hitting an error boundary.
 */
export async function fetchGitHub<T>(
  path: string,
): Promise<GitHubResult<T>> {
  const token = process.env.GITHUB_TOKEN

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })

    if (response.ok) {
      return { status: 'ok', data: (await response.json()) as T }
    }

    if (response.status === 404) {
      return { status: 'not-found' }
    }

    if (
      (response.status === 403 || response.status === 429) &&
      response.headers.get('x-ratelimit-remaining') === '0'
    ) {
      return { status: 'rate-limited', resetAt: resetAtFrom(response.headers) }
    }

    return {
      status: 'error',
      message: `GitHub responded with ${response.status}`,
    }
  } catch (cause) {
    return {
      status: 'error',
      message: cause instanceof Error ? cause.message : 'Network request failed',
    }
  }
}
```

Note there is no `cache` option on the `fetch` call. Under Cache Components,
caching is controlled by `'use cache'` in Task 5, not by fetch options.

- [ ] **Step 3: Verify against the live API**

This module imports nothing from Next.js, so it runs directly in Node.

```bash
cat > /tmp/check-github-client.mjs <<'EOF'
const base = `file://${process.cwd()}/`
const { fetchGitHub } = await import(new URL('./apps/web/lib/github/client.ts', base))

const ok = await fetchGitHub('/repos/vercel/next.js')
console.log('repo status:', ok.status, ok.status === 'ok' ? ok.data.full_name : '')

const missing = await fetchGitHub('/repos/vercel/definitely-not-a-real-repo-xyz')
console.log('missing status:', missing.status)

const commits = await fetchGitHub('/repos/vercel/next.js/commits?per_page=1')
console.log('commits status:', commits.status, commits.status === 'ok' ? commits.data.length : '')
EOF
node /tmp/check-github-client.mjs
```

Expected: `repo status: ok vercel/next.js`, `missing status: not-found`,
`commits status: ok 1`.

If `repo status` comes back `rate-limited`, the 60/hour ceiling is already spent
for this IP; either wait for the reset or export a `GITHUB_TOKEN` before
re-running. That outcome still confirms the rate-limit branch works.

Clean up with `rm /tmp/check-github-client.mjs`.

- [ ] **Step 4: check-types and lint**

Run:

```bash
pnpm check-types && pnpm lint
```

Expected: both succeed.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/github/types.ts apps/web/lib/github/client.ts
git commit -m "feat(github): add REST client returning a discriminated result"
```

---

### Task 4: The `/git` connect screen

First user-visible slice. After this task a user can submit a repository and land
on its (still non-existent) page, and a bad input shows an inline message.

**Files:**
- Create: `apps/web/lib/github/parse-repo-input.ts`
- Create: `apps/web/app/git/layout.tsx`
- Create: `apps/web/app/git/page.tsx`
- Create: `apps/web/app/git/actions.ts`
- Create: `apps/web/app/git/error.tsx`
- Create: `apps/web/components/git/repo-form.tsx`
- Create: `apps/web/components/git/git-breadcrumb.tsx`
- Create: `apps/web/components/git/rate-limit-notice.tsx`

**Interfaces:**
- Consumes: nothing from Tasks 1-3.
- Produces:
  - `parseRepoInput(input: string): ParsedRepoInput`, a union of
    `{ ok: true; owner: string; repo: string }` and
    `{ ok: false; error: string }`.
  - `connectRepo(state: ConnectRepoState, formData: FormData)` server action.
  - `<RateLimitNotice resetAt={Date | null} />`, used again in Tasks 5 and 6.

- [ ] **Step 1: Create the repository input parser**

Create `apps/web/lib/github/parse-repo-input.ts`:

```ts
export type ParsedRepoInput =
  | { ok: false; error: string }
  | { ok: true; owner: string; repo: string }

const VALID_SEGMENT = /^[\w.-]+$/

/**
 * Accepts a GitHub HTTPS URL, an SSH remote, or a bare owner/repo pair.
 * Extra path segments are ignored, so a URL copied from a branch or file view
 * still resolves to the repository.
 */
export function parseRepoInput(input: string): ParsedRepoInput {
  const trimmed = input.trim()

  if (!trimmed) {
    return { ok: false, error: 'Enter a repository.' }
  }

  const withoutHost = trimmed
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
    .replace(/^git@github\.com:/i, '')
    .replace(/^github\.com\//i, '')

  const segments = withoutHost
    .replace(/\.git(\/)?$/i, '')
    .replace(/\/+$/, '')
    .split('/')

  const [owner, repo] = segments

  if (!owner || !repo) {
    return {
      ok: false,
      error: 'Use a GitHub URL or owner/repo, for example vercel/next.js.',
    }
  }

  if (!VALID_SEGMENT.test(owner) || !VALID_SEGMENT.test(repo)) {
    return {
      ok: false,
      error:
        'Owner and repository may only contain letters, numbers, dots, hyphens, and underscores.',
    }
  }

  return { ok: true, owner, repo }
}
```

- [ ] **Step 2: Verify the parser accepts every documented input shape**

Run:

```bash
cat > /tmp/check-repo-input.mjs <<'EOF'
const base = `file://${process.cwd()}/`
const { parseRepoInput } = await import(
  new URL('./apps/web/lib/github/parse-repo-input.ts', base)
)
const cases = [
  ['vercel/next.js', 'vercel/next.js'],
  ['https://github.com/vercel/next.js', 'vercel/next.js'],
  ['https://github.com/vercel/next.js/', 'vercel/next.js'],
  ['https://github.com/vercel/next.js.git', 'vercel/next.js'],
  ['https://github.com/vercel/next.js/tree/canary', 'vercel/next.js'],
  ['git@github.com:vercel/next.js.git', 'vercel/next.js'],
  ['  vercel/next.js  ', 'vercel/next.js'],
]
let failed = 0
for (const [input, expected] of cases) {
  const r = parseRepoInput(input)
  const actual = r.ok ? r.owner + '/' + r.repo : 'ERROR'
  if (actual !== expected) { failed++; console.log('FAIL', JSON.stringify(input), '->', actual) }
}
for (const bad of ['', 'vercel', 'https://gitlab.com/a/b/c/d', 'ver cel/repo']) {
  const r = parseRepoInput(bad)
  if (r.ok) { failed++; console.log('FAIL should reject:', JSON.stringify(bad)) }
}
console.log(failed === 0 ? 'ALL PASS' : failed + ' FAILED')
EOF
node /tmp/check-repo-input.mjs
```

Expected: `ALL PASS`, then clean up with `rm /tmp/check-repo-input.mjs`. Note
`https://gitlab.com/a/b/c/d` is rejected because
`gitlab.com` is not stripped, leaving `https:` as the first segment, which fails
`VALID_SEGMENT` on the colon.

- [ ] **Step 3: Create the server action**

Create `apps/web/app/git/actions.ts`:

```ts
'use server'

import type { Route } from 'next'
import { redirect } from 'next/navigation'
import { parseRepoInput } from '@/lib/github/parse-repo-input'

export type ConnectRepoState = { error?: string }

export async function connectRepo(
  _state: ConnectRepoState,
  formData: FormData,
): Promise<ConnectRepoState> {
  const parsed = parseRepoInput(String(formData.get('repo') ?? ''))

  if (!parsed.ok) {
    return { error: parsed.error }
  }

  redirect(`/git/${parsed.owner}/${parsed.repo}` as Route)
}
```

`redirect` returns `never` and throws, so no return statement follows it. It must
stay outside any `try`/`catch`.

- [ ] **Step 4: Create the form**

Create `apps/web/components/git/repo-form.tsx`:

```tsx
'use client'

import { Button } from '@repo/ui/components/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@repo/ui/components/field'
import { Input } from '@repo/ui/components/input'
import { useActionState } from 'react'
import { type ConnectRepoState, connectRepo } from '@/app/git/actions'

const initialState: ConnectRepoState = {}

export function RepoForm() {
  const [state, formAction, pending] = useActionState(connectRepo, initialState)

  return (
    <form action={formAction} className='grid gap-6'>
      <Field>
        <FieldLabel htmlFor='repo'>Repository</FieldLabel>
        <Input
          id='repo'
          name='repo'
          placeholder='vercel/next.js'
          autoComplete='off'
          autoCapitalize='none'
          spellCheck={false}
          required
        />
        <FieldDescription>
          A GitHub URL or owner/repo. Public repositories only.
        </FieldDescription>
        {state.error ? <FieldError>{state.error}</FieldError> : null}
      </Field>

      <Button type='submit' disabled={pending}>
        {pending ? 'Connecting...' : 'Connect'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 5: Create the breadcrumb**

Create `apps/web/components/git/git-breadcrumb.tsx`. It is a Client Component
using `usePathname`, which keeps the layout free of any data access and therefore
free of any `Suspense` requirement.

```tsx
'use client'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@repo/ui/components/breadcrumb'
import type { Route } from 'next'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Fragment } from 'react'

export function GitBreadcrumb() {
  const pathname = usePathname()
  // Drop the leading 'git' segment; what remains is [owner, repo, 'commit', sha].
  const [owner, repo, kind, sha] = pathname.split('/').filter(Boolean).slice(1)

  const crumbs: Array<{ href: Route; label: string }> = []

  if (owner && repo) {
    crumbs.push({
      href: `/git/${owner}/${repo}` as Route,
      label: `${owner}/${repo}`,
    })

    if (kind === 'commit' && sha) {
      crumbs.push({
        href: `/git/${owner}/${repo}/commit/${sha}` as Route,
        label: sha.slice(0, 7),
      })
    }
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          {crumbs.length === 0 ? (
            <BreadcrumbPage>Git</BreadcrumbPage>
          ) : (
            <BreadcrumbLink render={<Link href='/git' />}>Git</BreadcrumbLink>
          )}
        </BreadcrumbItem>

        {crumbs.map((crumb, index) => (
          <Fragment key={crumb.href}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {index === crumbs.length - 1 ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink render={<Link href={crumb.href} />}>
                  {crumb.label}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
```

- [ ] **Step 6: Create the rate-limit notice**

Create `apps/web/components/git/rate-limit-notice.tsx`. Tasks 5 and 6 reuse this.

```tsx
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@repo/ui/components/empty'
import { ClockIcon } from 'lucide-react'

export function RateLimitNotice({ resetAt }: { resetAt: Date | null }) {
  return (
    <Empty className='border rounded-md bg-card'>
      <EmptyHeader>
        <EmptyMedia variant='icon'>
          <ClockIcon />
        </EmptyMedia>
        <EmptyTitle>GitHub rate limit reached</EmptyTitle>
        <EmptyDescription>
          {resetAt
            ? `Unauthenticated requests are capped at 60 per hour. The limit resets at ${resetAt.toLocaleTimeString()}.`
            : 'Unauthenticated requests are capped at 60 per hour. Try again shortly.'}
          {' Set GITHUB_TOKEN to raise the cap to 5,000 per hour.'}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
```

- [ ] **Step 7: Create the layout, page, and error boundary**

Create `apps/web/app/git/layout.tsx`. It is synchronous and reads no data:

```tsx
import { GitBreadcrumb } from '@/components/git/git-breadcrumb'

export default function GitLayout({ children }: LayoutProps<'/git'>) {
  return (
    <main className='min-h-svh p-6 w-full grid justify-items-center bg-muted/50 dark:bg-background'>
      <div className='grid min-w-0 w-full max-w-3xl gap-6 auto-rows-max items-start'>
        <GitBreadcrumb />
        {children}
      </div>
    </main>
  )
}
```

Create `apps/web/app/git/page.tsx`:

```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card'
import { RepoForm } from '@/components/git/repo-form'

export default function GitPage() {
  return (
    <Card className='shadow-md w-full max-w-md justify-self-center'>
      <CardHeader>
        <CardTitle>Connect a repository</CardTitle>
        <CardDescription>
          Browse the commit history of any public GitHub repository.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RepoForm />
      </CardContent>
    </Card>
  )
}
```

Create `apps/web/app/git/error.tsx`. The prop is `unstable_retry`, not `reset`:

```tsx
'use client'

import { Button } from '@repo/ui/components/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@repo/ui/components/empty'
import { TriangleAlertIcon } from 'lucide-react'

export default function GitError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    <Empty className='border rounded-md bg-card'>
      <EmptyHeader>
        <EmptyMedia variant='icon'>
          <TriangleAlertIcon />
        </EmptyMedia>
        <EmptyTitle>Could not load from GitHub</EmptyTitle>
        <EmptyDescription>{error.message}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={() => unstable_retry()}>Try again</Button>
      </EmptyContent>
    </Empty>
  )
}
```

- [ ] **Step 8: check-types, lint, and verify in the browser**

Run:

```bash
pnpm check-types && pnpm lint
```

Expected: both succeed. Then run `pnpm dev` and open
`http://localhost:3000/git`. Confirm all four:

1. The card renders with the breadcrumb showing "Git" as plain text.
2. Submitting `not-a-repo` shows the inline message "Use a GitHub URL or
   owner/repo, for example vercel/next.js." and stays on the page.
3. Submitting `https://github.com/vercel/next.js` navigates to
   `/git/vercel/next.js`. A Next.js 404 there is the expected result at this
   point, since Task 5 creates that page.
4. No console warning about blocking data outside `<Suspense>`.

- [ ] **Step 9: Commit**

```bash
git add apps/web/lib/github/parse-repo-input.ts apps/web/app/git apps/web/components/git
git commit -m "feat(git): add /git connect screen with repo input parsing"
```

---

### Task 5: Commit list screen

Adds the cached data layer and the repository page. The cached functions live here
rather than in Task 3 so they land with their first consumer and can be verified
end to end in the browser.

**Files:**
- Create: `apps/web/lib/github/commits.ts`
- Create: `apps/web/app/git/[owner]/[repo]/page.tsx`
- Create: `apps/web/app/git/[owner]/[repo]/not-found.tsx`
- Create: `apps/web/components/git/repo-header.tsx`
- Create: `apps/web/components/git/commit-list.tsx`
- Create: `apps/web/components/git/skeletons.tsx`

**Interfaces:**
- Consumes: `fetchGitHub`, `GitHubResult` and the types from Task 3;
  `RateLimitNotice` from Task 4.
- Produces:
  - `COMMITS_PER_PAGE` (30).
  - `getRepo(owner, repo): Promise<GitHubResult<GitHubRepo>>`.
  - `getCommits(owner, repo, page): Promise<GitHubResult<GitHubCommitSummary[]>>`.
  - `getCommit(owner, repo, sha): Promise<GitHubResult<GitHubCommitDetail>>`, used
    by Task 6.
  - `RepoHeaderSkeleton`, `CommitListSkeleton`, `CommitDetailSkeleton`, the last
    used by Task 6.

- [ ] **Step 1: Create the cached data layer**

Create `apps/web/lib/github/commits.ts`. Every function takes plain string
arguments; request-specific values such as `params` are awaited by the caller and
passed in, because `'use cache'` cannot read them directly.

```ts
import { cacheLife, cacheTag } from 'next/cache'
import { fetchGitHub, type GitHubResult } from './client'
import type {
  GitHubCommitDetail,
  GitHubCommitSummary,
  GitHubRepo,
} from './types'

export const COMMITS_PER_PAGE = 30

function repoPath(owner: string, repo: string): string {
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
}

export async function getRepo(
  owner: string,
  repo: string,
): Promise<GitHubResult<GitHubRepo>> {
  'use cache'
  cacheTag(`repo:${owner}/${repo}`)

  const result = await fetchGitHub<GitHubRepo>(repoPath(owner, repo))

  // Never hold a failure for long: the condition that caused it is transient.
  cacheLife(result.status === 'ok' ? 'minutes' : 'seconds')

  return result
}

export async function getCommits(
  owner: string,
  repo: string,
  page: number,
): Promise<GitHubResult<GitHubCommitSummary[]>> {
  'use cache'
  cacheTag(`repo:${owner}/${repo}`)

  const result = await fetchGitHub<GitHubCommitSummary[]>(
    `${repoPath(owner, repo)}/commits?per_page=${COMMITS_PER_PAGE}&page=${page}`,
  )

  cacheLife(result.status === 'ok' ? 'minutes' : 'seconds')

  return result
}

export async function getCommit(
  owner: string,
  repo: string,
  sha: string,
): Promise<GitHubResult<GitHubCommitDetail>> {
  'use cache'
  cacheTag(`repo:${owner}/${repo}`)

  const result = await fetchGitHub<GitHubCommitDetail>(
    `${repoPath(owner, repo)}/commits/${encodeURIComponent(sha)}`,
  )

  // A commit addressed by SHA is immutable, so it can be cached indefinitely.
  cacheLife(result.status === 'ok' ? 'max' : 'seconds')

  return result
}
```

- [ ] **Step 2: Create the skeletons**

Create `apps/web/components/git/skeletons.tsx`:

```tsx
import { Skeleton } from '@repo/ui/components/skeleton'

export function RepoHeaderSkeleton() {
  return (
    <div className='grid gap-2 w-full'>
      <Skeleton className='h-8 w-64' />
      <Skeleton className='h-4 w-full max-w-md' />
    </div>
  )
}

export function CommitListSkeleton() {
  return (
    <div className='grid gap-2 w-full'>
      {[0, 1, 2, 3, 4].map((row) => (
        <Skeleton key={row} className='h-16 w-full' />
      ))}
    </div>
  )
}

export function CommitDetailSkeleton() {
  return (
    <div className='grid gap-4 w-full'>
      <Skeleton className='h-24 w-full' />
      <Skeleton className='h-64 w-full' />
      <Skeleton className='h-64 w-full' />
    </div>
  )
}
```

- [ ] **Step 3: Create the repository header**

Create `apps/web/components/git/repo-header.tsx`. Note the three-line result
handling: not-found redirects to the not-found UI, rate limiting renders, and
anything else throws to the error boundary. The same three lines appear in the
commit list and commit detail because each one needs its own fallback placement.

```tsx
import { Badge } from '@repo/ui/components/badge'
import { StarIcon } from 'lucide-react'
import { notFound } from 'next/navigation'
import { RateLimitNotice } from '@/components/git/rate-limit-notice'
import { getRepo } from '@/lib/github/commits'

export async function RepoHeader({
  params,
}: {
  params: PageProps<'/git/[owner]/[repo]'>['params']
}) {
  const { owner, repo } = await params
  const result = await getRepo(owner, repo)

  if (result.status === 'not-found') {
    notFound()
  }

  if (result.status === 'rate-limited') {
    return <RateLimitNotice resetAt={result.resetAt} />
  }

  if (result.status === 'error') {
    throw new Error(result.message)
  }

  return (
    <div className='grid gap-2 w-full'>
      <h1 className='scroll-m-20 text-3xl font-semibold tracking-tight'>
        {result.data.full_name}
      </h1>

      {result.data.description ? (
        <p className='text-muted-foreground text-sm'>
          {result.data.description}
        </p>
      ) : null}

      <div className='flex gap-2 items-center'>
        <Badge variant='outline' className='font-mono'>
          {result.data.default_branch}
        </Badge>
        <span className='text-muted-foreground text-xs flex gap-1 items-center'>
          <StarIcon className='size-3' />
          {result.data.stargazers_count.toLocaleString()}
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create the commit list**

Create `apps/web/components/git/commit-list.tsx`. Prev/Next are `Button`s
rendering `Link`s rather than the `Pagination` primitives, because
`PaginationLink` renders a bare `<a>` and would trigger a full page load.

```tsx
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/avatar'
import { Button } from '@repo/ui/components/button'
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
} from '@repo/ui/components/empty'
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@repo/ui/components/item'
import type { Route } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { RateLimitNotice } from '@/components/git/rate-limit-notice'
import { COMMITS_PER_PAGE, getCommits } from '@/lib/github/commits'
import type { GitHubCommitSummary } from '@/lib/github/types'

function toPageNumber(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number(raw)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

function subjectOf(message: string): string {
  return message.split('\n')[0] ?? message
}

function authoredAgo(commit: GitHubCommitSummary): string {
  const date = commit.commit.author?.date

  return date ? new Date(date).toLocaleDateString() : 'unknown date'
}

export async function CommitList({
  params,
  searchParams,
}: {
  params: PageProps<'/git/[owner]/[repo]'>['params']
  searchParams: PageProps<'/git/[owner]/[repo]'>['searchParams']
}) {
  const { owner, repo } = await params
  const page = toPageNumber((await searchParams).page)
  const result = await getCommits(owner, repo, page)

  if (result.status === 'not-found') {
    notFound()
  }

  if (result.status === 'rate-limited') {
    return <RateLimitNotice resetAt={result.resetAt} />
  }

  if (result.status === 'error') {
    throw new Error(result.message)
  }

  if (result.data.length === 0) {
    return (
      <Empty className='border rounded-md bg-card'>
        <EmptyHeader>
          <EmptyTitle>No commits on this page</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className='grid gap-4 w-full'>
      <ItemGroup>
        {result.data.map((commit) => (
          <Item
            key={commit.sha}
            size='sm'
            render={
              <Link
                href={`/git/${owner}/${repo}/commit/${commit.sha}` as Route}
              />
            }
          >
            <ItemMedia>
              <Avatar className='size-6'>
                {commit.author ? (
                  <AvatarImage src={commit.author.avatar_url} alt='' />
                ) : null}
                <AvatarFallback>
                  {(commit.commit.author?.name ?? '?').slice(0, 1)}
                </AvatarFallback>
              </Avatar>
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{subjectOf(commit.commit.message)}</ItemTitle>
              <ItemDescription>
                {commit.commit.author?.name ?? 'Unknown author'} committed{' '}
                {authoredAgo(commit)}
              </ItemDescription>
            </ItemContent>
            <span className='font-mono text-xs text-muted-foreground self-center'>
              {commit.sha.slice(0, 7)}
            </span>
          </Item>
        ))}
      </ItemGroup>

      <div className='flex gap-2 justify-center'>
        {page > 1 ? (
          <Button
            nativeButton={false}
            variant='outline'
            size='sm'
            render={
              <Link href={`/git/${owner}/${repo}?page=${page - 1}` as Route} />
            }
          >
            <ChevronLeftIcon />
            Newer
          </Button>
        ) : null}

        {result.data.length === COMMITS_PER_PAGE ? (
          <Button
            nativeButton={false}
            variant='outline'
            size='sm'
            render={
              <Link href={`/git/${owner}/${repo}?page=${page + 1}` as Route} />
            }
          >
            Older
            <ChevronRightIcon />
          </Button>
        ) : null}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create the page and not-found UI**

Create `apps/web/app/git/[owner]/[repo]/page.tsx`. The page is deliberately not
`async`: it passes the unawaited promises to children so each child suspends
independently.

```tsx
import { Suspense } from 'react'
import { CommitList } from '@/components/git/commit-list'
import { RepoHeader } from '@/components/git/repo-header'
import {
  CommitListSkeleton,
  RepoHeaderSkeleton,
} from '@/components/git/skeletons'

export default function RepoPage({
  params,
  searchParams,
}: PageProps<'/git/[owner]/[repo]'>) {
  return (
    <>
      <Suspense fallback={<RepoHeaderSkeleton />}>
        <RepoHeader params={params} />
      </Suspense>

      <Suspense fallback={<CommitListSkeleton />}>
        <CommitList params={params} searchParams={searchParams} />
      </Suspense>
    </>
  )
}
```

Create `apps/web/app/git/[owner]/[repo]/not-found.tsx`:

```tsx
import { Button } from '@repo/ui/components/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@repo/ui/components/empty'
import { SearchXIcon } from 'lucide-react'
import Link from 'next/link'

export default function RepoNotFound() {
  return (
    <Empty className='border rounded-md bg-card'>
      <EmptyHeader>
        <EmptyMedia variant='icon'>
          <SearchXIcon />
        </EmptyMedia>
        <EmptyTitle>Not found on GitHub</EmptyTitle>
        <EmptyDescription>
          That repository or commit does not exist, or it is private.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button nativeButton={false} render={<Link href='/git' />}>
          Try another repository
        </Button>
      </EmptyContent>
    </Empty>
  )
}
```

- [ ] **Step 6: check-types, lint, and verify in the browser**

Run:

```bash
pnpm check-types && pnpm lint
```

Expected: both succeed. A failure reading
`Uncached data was accessed outside of <Suspense>` or `blocking-route` means a
component awaiting `params` is not inside a boundary; re-check Step 5.

Then run `pnpm dev` and confirm all five:

1. `http://localhost:3000/git/vercel/next.js` renders the header with description,
   default branch badge, and star count, plus 30 commits.
2. Each row shows an avatar, message subject, author, date, and 7-character SHA.
3. "Older" navigates to `?page=2` and shows different commits; "Newer" returns.
   "Newer" is absent on page 1.
4. `http://localhost:3000/git/vercel/definitely-not-real-xyz` renders the
   not-found UI, not a stack trace.
5. The breadcrumb reads "Git / vercel/next.js" with "Git" clickable.

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/github/commits.ts apps/web/app/git apps/web/components/git
git commit -m "feat(git): add cached data layer and repo commit list screen"
```

---

### Task 6: Commit detail screen with diffs

The payoff: this is where `CodeBlock` renders the diffs, wiring together the
parser from Task 2 and the language map from Task 1.

**Files:**
- Create: `apps/web/app/git/[owner]/[repo]/commit/[sha]/page.tsx`
- Create: `apps/web/components/git/commit-detail.tsx`
- Create: `apps/web/components/git/file-diff.tsx`

**Interfaces:**
- Consumes: `parsePatch` (Task 2), `languageForFilename` (Task 1), `getCommit`
  (Task 5), `RateLimitNotice` (Task 4), `CommitDetailSkeleton` (Task 5),
  `GitHubCommitFile` (Task 3), and the existing `CodeBlock` at
  `apps/web/components/code-block.tsx`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Create the file diff component**

Create `apps/web/components/git/file-diff.tsx`:

```tsx
import { createHighlightedCodeBlockProps } from '@tanstack/highlight/react'
import { CodeBlock } from '@/components/code-block'
import { languageForFilename } from '@/lib/diff/language-for-filename'
import { parsePatch } from '@/lib/diff/parse-patch'
import type { GitHubCommitFile } from '@/lib/github/types'
import { highlighter } from '@/lib/highlight'

export function FileDiff({ file }: { file: GitHubCommitFile }) {
  const heading = (
    <div className='flex gap-3 items-center text-xs'>
      <span className='text-muted-foreground'>{file.status}</span>
      <span className='text-emerald-600 dark:text-emerald-400'>
        +{file.additions}
      </span>
      <span className='text-red-600 dark:text-red-400'>-{file.deletions}</span>
      {file.previous_filename ? (
        <span className='text-muted-foreground font-mono'>
          renamed from {file.previous_filename}
        </span>
      ) : null}
    </div>
  )

  if (!file.patch) {
    return (
      <div className='grid gap-2 w-full'>
        {heading}
        <div className='border rounded-md bg-card p-4'>
          <p className='font-mono text-xs'>{file.filename}</p>
          <p className='text-muted-foreground text-sm mt-1'>
            No diff available. GitHub omits patches for binary files and for
            changes it considers too large.
          </p>
        </div>
      </div>
    )
  }

  const { code, decorations } = parsePatch(file.patch)

  const props = createHighlightedCodeBlockProps({
    code,
    decorations,
    highlighter,
    lang: languageForFilename(file.filename),
    lineNumbers: true,
    title: file.filename,
  })

  return (
    <div className='grid gap-2 w-full'>
      {heading}
      <CodeBlock {...props} />
    </div>
  )
}
```

- [ ] **Step 2: Create the commit detail component**

Create `apps/web/components/git/commit-detail.tsx`:

```tsx
import { Badge } from '@repo/ui/components/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card'
import { notFound } from 'next/navigation'
import { FileDiff } from '@/components/git/file-diff'
import { RateLimitNotice } from '@/components/git/rate-limit-notice'
import { getCommit } from '@/lib/github/commits'

// GitHub caps the files array in a commit response at 300 entries.
const FILE_LIMIT = 300

export async function CommitDetail({
  params,
}: {
  params: PageProps<'/git/[owner]/[repo]/commit/[sha]'>['params']
}) {
  const { owner, repo, sha } = await params
  const result = await getCommit(owner, repo, sha)

  if (result.status === 'not-found') {
    notFound()
  }

  if (result.status === 'rate-limited') {
    return <RateLimitNotice resetAt={result.resetAt} />
  }

  if (result.status === 'error') {
    throw new Error(result.message)
  }

  const commit = result.data
  const [subject, ...body] = commit.commit.message.split('\n')
  const files = commit.files ?? []

  return (
    <div className='grid gap-6 w-full'>
      <Card>
        <CardHeader>
          <CardTitle>{subject}</CardTitle>
          <CardDescription>
            {commit.commit.author?.name ?? 'Unknown author'} committed{' '}
            {commit.commit.author?.date
              ? new Date(commit.commit.author.date).toLocaleString()
              : 'at an unknown time'}
          </CardDescription>
        </CardHeader>
        <CardContent className='grid gap-4'>
          {body.join('\n').trim() ? (
            <pre className='text-xs whitespace-pre-wrap font-mono text-muted-foreground'>
              {body.join('\n').trim()}
            </pre>
          ) : null}

          <div className='flex gap-2 items-center'>
            <Badge variant='outline' className='font-mono'>
              {commit.sha.slice(0, 7)}
            </Badge>
            <span className='text-xs text-emerald-600 dark:text-emerald-400'>
              +{commit.stats?.additions ?? 0}
            </span>
            <span className='text-xs text-red-600 dark:text-red-400'>
              -{commit.stats?.deletions ?? 0}
            </span>
            <span className='text-xs text-muted-foreground'>
              {files.length} {files.length === 1 ? 'file' : 'files'} changed
            </span>
          </div>
        </CardContent>
      </Card>

      {files.map((file) => (
        <FileDiff key={file.filename} file={file} />
      ))}

      {files.length >= FILE_LIMIT ? (
        <p className='text-muted-foreground text-sm text-center'>
          GitHub returns at most {FILE_LIMIT} files per commit, so this list is
          truncated.
        </p>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 3: Create the page**

Create `apps/web/app/git/[owner]/[repo]/commit/[sha]/page.tsx`:

```tsx
import { Suspense } from 'react'
import { CommitDetail } from '@/components/git/commit-detail'
import { CommitDetailSkeleton } from '@/components/git/skeletons'

export default function CommitPage({
  params,
}: PageProps<'/git/[owner]/[repo]/commit/[sha]'>) {
  return (
    <Suspense fallback={<CommitDetailSkeleton />}>
      <CommitDetail params={params} />
    </Suspense>
  )
}
```

- [ ] **Step 4: check-types, lint, and verify in the browser**

Run:

```bash
pnpm check-types && pnpm lint
```

Expected: both succeed.

Then run `pnpm dev`, open `http://localhost:3000/git/vercel/next.js`, and click a
commit. Confirm all six:

1. The card shows the commit subject, author, timestamp, short SHA, and
   additions/deletions counts.
2. Each changed file renders a `CodeBlock` with the file path in its header and a
   language badge beside it.
3. Added lines have a green background with a green left border; removed lines
   have red. Hunk headers such as `@@ -1,6 +1,7 @@` have the accent background.
4. No `+` or `-` markers remain at the start of code lines.
5. The copy button appears on hover and copies the code without diff markers.
6. Toggling dark mode keeps the diff colors legible.

To exercise the no-patch path, open a commit that changes a binary file, for
example one touching a `.png` or lockfile, and confirm the "No diff available"
notice renders instead of an empty code block.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/git apps/web/components/git
git commit -m "feat(git): render commit diffs per file with CodeBlock"
```

---

### Task 7: Discoverability and documentation

**Files:**
- Modify: `apps/web/app/page.tsx`
- Modify: `README.md`

**Interfaces:**
- Consumes: the `/git` route from Task 4.
- Produces: nothing.

- [ ] **Step 1: Link the feature from the home page**

`apps/web/app/page.tsx` currently renders only the text "Home". Replace its
contents with links to both features, following the `ItemGroup` pattern already
used in `apps/web/app/components/page.tsx`:

```tsx
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@repo/ui/components/item'
import type { Route } from 'next'
import Link from 'next/link'

const sections: Array<{ desc: string; href: Route; id: string; title: string }> =
  [
    {
      id: 'components',
      title: 'Components',
      desc: 'Preview the UI components in this workspace.',
      href: '/components',
    },
    {
      id: 'git',
      title: 'Git',
      desc: 'Connect a public GitHub repository and read its commit diffs.',
      href: '/git',
    },
  ]

export default function Page() {
  return (
    <main className='min-h-svh p-6 pt-20 w-full grid justify-items-center'>
      <div className='grid max-w-md min-w-0 w-full gap-12 auto-rows-max items-start'>
        <h1 className='scroll-m-20 text-3xl font-semibold tracking-tight'>
          Crispy Code
        </h1>
        <ItemGroup>
          {sections.map(({ id, title, desc, href }) => (
            <Item key={id} size='sm' render={<Link href={href} />}>
              <ItemContent>
                <ItemTitle>{title}</ItemTitle>
                <ItemDescription>{desc}</ItemDescription>
              </ItemContent>
            </Item>
          ))}
        </ItemGroup>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Document the optional token**

Append this section to `README.md`:

```markdown
## Git commit viewer

Visit `/git` to connect a public GitHub repository and browse its commits, with
each commit's per-file diff rendered through the `CodeBlock` component.

Requests go to the GitHub REST API unauthenticated, which GitHub limits to 60 per
hour per IP address. Responses are cached, but to raise the limit to 5,000 per
hour create `apps/web/.env.local` with a token that needs no scopes for public
repositories:

```bash
GITHUB_TOKEN=ghp_your_token_here
```

The token is optional; the feature works without it.
```

- [ ] **Step 3: check-types, lint, and verify**

Run:

```bash
pnpm check-types && pnpm lint
```

Expected: both succeed. Then run `pnpm dev` and confirm `http://localhost:3000`
lists both Components and Git, and that the Git link reaches the connect form.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/page.tsx README.md
git commit -m "docs(git): link the git viewer from home and document GITHUB_TOKEN"
```

---

## Final Verification

After Task 7, run the full check from the repo root:

```bash
pnpm check-types && pnpm lint && pnpm build
```

Expected: all three succeed. `pnpm build` is the important one, because Cache
Components surfaces blocking-route errors at build time that `pnpm dev` may only
warn about.

Then walk the spec's success criteria:

1. `/git` accepts `vercel/next.js`, its HTTPS URL, and its SSH URL.
2. The commit list shows 30 commits and paginates both directions.
3. A commit renders every changed file with correct highlighting and green/red
   row shading.
4. A nonexistent repository and a nonexistent SHA both show the not-found UI.
5. The rate-limit state appears rather than an error boundary when the limit is
   exhausted. To force this without waiting, temporarily change `fetchGitHub` to
   return `{ status: 'rate-limited', resetAt: new Date(Date.now() + 3600_000) }`,
   confirm the notice, then revert.


