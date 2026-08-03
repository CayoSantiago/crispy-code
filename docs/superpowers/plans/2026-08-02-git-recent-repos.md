# Recent GitHub Repos on /git Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist the last 8 successfully connected GitHub repos in `localStorage` and show them as clickable chips under the Connect Card on `/git`.

**Architecture:** Pure helpers in `features/github/recent-repos.ts` own the MRU list and localStorage I/O. `RepoForm` writes on successful client-side parse before the existing `connectRepo` action runs. A client `RecentReposList` sibling under the Card reads on mount and links to `/git/[owner]/[repo]`.

**Tech Stack:** Next.js 16 App Router, React 19 client components, Zod 4, `@repo/ui` Button + Next.js `Link`, Biome, pnpm + Turborepo.

**Spec:** `docs/superpowers/specs/2026-08-02-git-recent-repos-design.md`

## Global Constraints

- Storage key exactly: `crispy-code:git:recent-repos`
- Value: JSON array of normalized `owner/repo` strings, newest first, max **8**
- Save only after successful `parseRepoInput` on Connect submit; never on failed parse or direct URL visits
- Click navigates to `/git/{owner}/{repo}` (no form fill)
- List is a **sibling below** the Connect Card (not inside it), only on `/git`
- No clear/remove UI; corrupt or blocked localStorage → treat as `[]` / fail silently
- No test framework exists and adding one is out of scope. Verify with `pnpm --filter web check-types`, `pnpm lint:fix`, `pnpm lint`, plus the manual checks in Task 3
- Code style: Biome — single quotes, no semicolons. Run `pnpm lint:fix` before each commit
- Stay inside `apps/web` git feature surface; do not add new packages

## File structure

| File | Responsibility |
|---|---|
| `apps/web/features/github/recent-repos.ts` | Cap, schema, MRU helper, read/write/remember localStorage |
| `apps/web/components/git/recent-repos-list.tsx` | Client list of recent chips under the Card |
| `apps/web/components/git/repo-form.tsx` | Persist on successful parse in `onSubmit` |
| `apps/web/app/git/page.tsx` | Centered column wrapping Card + `RecentReposList` |

---

### Task 1: Recent-repos storage module

**Files:**
- Create: `apps/web/features/github/recent-repos.ts`

**Interfaces:**
- Consumes: `z` from `zod`; `resilientArray` from `@/lib/schemas`
- Produces:
  - `MAX_RECENT_REPOS = 8`
  - `RECENT_REPOS_STORAGE_KEY = 'crispy-code:git:recent-repos'`
  - `addRecentRepo(existing: string[], owner: string, repo: string): string[]`
  - `readRecentRepos(): string[]`
  - `writeRecentRepos(list: string[]): void`
  - `rememberRecentRepo(owner: string, repo: string): void` — read → add → write, never throws

- [ ] **Step 1: Create `apps/web/features/github/recent-repos.ts`**

```ts
import { z } from 'zod'
import { resilientArray } from '@/lib/schemas'

export const MAX_RECENT_REPOS = 8
export const RECENT_REPOS_STORAGE_KEY = 'crispy-code:git:recent-repos'

const recentRepoEntrySchema = z
  .string()
  .regex(/^[\w.-]+\/[\w.-]+$/)

const recentReposSchema = resilientArray(recentRepoEntrySchema).transform(
  (items) => items.slice(0, MAX_RECENT_REPOS),
)

export function addRecentRepo(
  existing: string[],
  owner: string,
  repo: string,
): string[] {
  const entry = `${owner}/${repo}`
  return [entry, ...existing.filter((value) => value !== entry)].slice(
    0,
    MAX_RECENT_REPOS,
  )
}

function parseStoredRepos(raw: string | null): string[] {
  if (raw == null) {
    return []
  }

  try {
    return recentReposSchema.parse(JSON.parse(raw))
  } catch {
    return []
  }
}

export function readRecentRepos(): string[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    return parseStoredRepos(localStorage.getItem(RECENT_REPOS_STORAGE_KEY))
  } catch {
    return []
  }
}

export function writeRecentRepos(list: string[]): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    localStorage.setItem(
      RECENT_REPOS_STORAGE_KEY,
      JSON.stringify(list.slice(0, MAX_RECENT_REPOS)),
    )
  } catch {
    // Quota / private mode — Connect must still work.
  }
}

export function rememberRecentRepo(owner: string, repo: string): void {
  writeRecentRepos(addRecentRepo(readRecentRepos(), owner, repo))
}
```

- [ ] **Step 2: Typecheck the new module**

Run: `pnpm --filter web check-types`

Expected: exit 0 (no errors in `recent-repos.ts`)

- [ ] **Step 3: Lint and commit**

```bash
pnpm lint:fix
git add apps/web/features/github/recent-repos.ts
git commit -m "$(cat <<'EOF'
feat(git): add localStorage helpers for recent repos

EOF
)"
```

---

### Task 2: Recent list UI + page layout + form persist

**Files:**
- Create: `apps/web/components/git/recent-repos-list.tsx`
- Modify: `apps/web/app/git/page.tsx`
- Modify: `apps/web/components/git/repo-form.tsx`

**Interfaces:**
- Consumes:
  - `readRecentRepos` from `@/features/github/recent-repos`
  - `rememberRecentRepo` from `@/features/github/recent-repos`
  - `parseRepoInput` from `@/features/github/parse-repo-input`
  - Existing `connectRepo` / `useActionState` in `RepoForm`
- Produces:
  - `RecentReposList` client component (hidden when empty)
  - `/git` page column with Card + list sibling
  - `RepoForm` `onSubmit` that calls `rememberRecentRepo` only when parse succeeds

- [ ] **Step 1: Create `apps/web/components/git/recent-repos-list.tsx`**

```tsx
'use client'

import { Button } from '@repo/ui/components/button'
import type { Route } from 'next'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { readRecentRepos } from '@/features/github/recent-repos'

export function RecentReposList() {
  const [repos, setRepos] = useState<string[]>([])

  useEffect(() => {
    setRepos(readRecentRepos())
  }, [])

  if (repos.length === 0) {
    return null
  }

  return (
    <div className='flex flex-wrap gap-2 items-center'>
      <span className='text-xs text-muted-foreground'>Recent:</span>
      {repos.map((recent) => {
        const [owner, repo] = recent.split('/')
        if (!owner || !repo) {
          return null
        }

        return (
          <Button
            key={recent}
            nativeButton={false}
            variant='outline'
            size='sm'
            className='h-7 text-xs'
            render={
              <Link href={`/git/${owner}/${repo}` as Route} />
            }
          >
            {recent}
          </Button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Update `apps/web/app/git/page.tsx`**

Replace the file with:

```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card'
import { RecentReposList } from '@/components/git/recent-repos-list'
import { RepoForm } from '@/components/git/repo-form'

export default function GitPage() {
  return (
    <div className='grid w-full max-w-md justify-self-center gap-4'>
      <Card className='shadow-md w-full'>
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
      <RecentReposList />
    </div>
  )
}
```

- [ ] **Step 3: Persist on Connect in `apps/web/components/git/repo-form.tsx`**

Replace the file with:

```tsx
'use client'

import { Button } from '@repo/ui/components/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@repo/ui/components/field'
import { Input } from '@repo/ui/components/input'
import { type FormEvent, useActionState } from 'react'
import { type ConnectRepoState, connectRepo } from '@/app/git/actions'
import { parseRepoInput } from '@/features/github/parse-repo-input'
import { rememberRecentRepo } from '@/features/github/recent-repos'

const initialState: ConnectRepoState = {}

export function RepoForm() {
  const [state, formAction, pending] = useActionState(connectRepo, initialState)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget)
    const repo = String(formData.get('repo') ?? '')
    const parsed = parseRepoInput(repo)

    if (parsed.ok) {
      rememberRecentRepo(parsed.owner, parsed.repo)
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className='grid gap-6'>
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

Important: do **not** call `event.preventDefault()`. The action must still run so invalid input shows the server error and valid input still redirects.

- [ ] **Step 4: Typecheck and lint**

Run:

```bash
pnpm --filter web check-types
pnpm lint:fix
pnpm lint
```

Expected: all exit 0.

- [ ] **Step 5: Commit**

```bash
git add \
  apps/web/features/github/recent-repos.ts \
  apps/web/components/git/recent-repos-list.tsx \
  apps/web/app/git/page.tsx \
  apps/web/components/git/repo-form.tsx
git commit -m "$(cat <<'EOF'
feat(git): show recent repos under the connect card

EOF
)"
```

---

### Task 3: Manual verification

**Files:** none (browser + already-committed code)

**Interfaces:** none

- [ ] **Step 1: Start the web app if it is not already running**

Run: `pnpm --filter web dev`

Open `/git`.

- [ ] **Step 2: Exercise the checklist from the spec**

1. Connect several distinct repos via the form (e.g. `vercel/next.js`, `facebook/react`, `tanstack/query`). After each connect, use the breadcrumb/link back to `/git` and confirm they appear under the Card newest-first.
2. Re-connect an older entry via the form; confirm it moves to the front without duplicating.
3. Connect enough distinct repos to exceed 8; confirm the oldest drops off.
4. Full reload `/git`; confirm the list persists.
5. Click a chip; confirm navigation to `/git/owner/repo`.
6. Submit invalid input (e.g. `not-a-repo`); confirm the inline error appears and the recent list is unchanged.
7. In DevTools → Application → Local Storage, confirm key `crispy-code:git:recent-repos` holds a JSON array of `owner/repo` strings.

- [ ] **Step 3: Final lint/types gate**

Run:

```bash
pnpm --filter web check-types
pnpm lint
```

Expected: exit 0. If anything failed during manual testing, fix and amend only if the commit has not been pushed and was created in this session; otherwise create a follow-up commit.

---

## Spec coverage checklist

| Spec requirement | Task |
|---|---|
| localStorage key + max 8 MRU `owner/repo` | Task 1 |
| Resilient parse / silent write failures | Task 1 |
| Save on successful Connect parse only | Task 2 (`RepoForm`) |
| List sibling under Card on `/git` | Task 2 (`page` + `RecentReposList`) |
| Chip click → `/git/owner/repo` | Task 2 |
| No clear/remove; empty hidden | Task 2 |
| Manual + check-types + lint verification | Task 3 |
