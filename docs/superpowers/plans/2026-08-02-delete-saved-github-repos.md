# Delete Saved GitHub Repos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users delete saved GitHub repos from `/find` (sync-card trash and lookup uncheck), removing both the config entry and the on-disk mirror.

**Architecture:** A shared server helper deletes the mirror under `FIND_MIRROR_ROOT` (path-safe) then updates Find config. New `find.removeGitHubRepo` powers the trash button; `find.setGitHubRepoSelection(selected: false)` calls the same helper so uncheck behaves identically.

**Tech Stack:** Next.js 16 App Router, oRPC (`@orpc/server` / `@orpc/tanstack-query`), TanStack Query, zod 4, Node `fs/promises`, Biome, pnpm + Turborepo.

**Spec:** `docs/superpowers/specs/2026-08-02-delete-saved-github-repos-design.md`

## Global Constraints

- Delete = config remove **and** wipe `~/.crispy-code/repos/{owner}/{repo}` (and best-effort empty owner dir).
- Trash on sync card **and** uncheck in lookup must share one helper (identical behavior).
- No confirmation dialog; no undo; no soft-delete.
- Do not change local-root remove (still config-only).
- Path safety: reject any resolved path that is not strictly under `FIND_MIRROR_ROOT`.
- Ordering: resolve path → delete mirror → update config. If mirror delete fails, leave config intact.
- Idempotent: missing config entry and/or missing mirror are success.
- No test framework exists and adding one is out of scope. Verify with `pnpm --filter web check-types`, `pnpm lint:fix`, `pnpm lint`, plus the manual checks in Task 3.
- Code style: Biome — single quotes, no semicolons. Run `pnpm lint:fix` before each commit.
- Stay inside `apps/web` Find/oRPC surface; do not add new packages.

## File structure

| File | Responsibility |
|---|---|
| `apps/web/lib/fs.ts` | Add `resolveUnderRoot` + reuse for safe deletes |
| `apps/web/features/find/remove-github-repo.ts` | Shared `removeGitHubRepoFromConfigAndDisk` helper |
| `apps/web/features/find/orpc.ts` | New `removeGitHubRepo`; deselect path delegates to helper |
| `apps/web/components/find/github-mirror-sync-card.tsx` | Trash button + mutation wiring |

---

### Task 1: Shared remove helper + oRPC wiring

**Files:**
- Modify: `apps/web/lib/fs.ts`
- Create: `apps/web/features/find/remove-github-repo.ts`
- Modify: `apps/web/features/find/orpc.ts`

**Interfaces:**
- Consumes: `FIND_MIRROR_ROOT` from `@/features/find/config/data`; `readFindConfig` / `updateFindConfig` from `@/features/find/config/service`; `base` from `@/lib/orpc/base`.
- Produces:
  - `resolveUnderRoot(root: string, ...segments: string[]): string | null` from `@/lib/fs`
  - `removeGitHubRepoFromConfigAndDisk(input: { id: string; owner?: string; repo?: string }): Promise<void>` from `@/features/find/remove-github-repo` — throws `Error` with a user-facing message on path/delete failure; resolves on success/no-op
  - `find.removeGitHubRepo` procedure: input `{ id: string }`, output `void`
  - `find.setGitHubRepoSelection` on `selected: false` calls the helper with `{ id, owner, repo }` from input

- [ ] **Step 1: Add path-safety helper in `lib/fs.ts`**

Add these imports at the top of `apps/web/lib/fs.ts` (merge with existing `node:fs/promises` import):

```ts
import { access, constants, mkdir, readFile, readdir, rm, rmdir, stat } from 'node:fs/promises'
```

Add after `normalizeLocalPath`:

```ts
/**
 * Resolve `root/segments...` and return the absolute path only if it stays
 * strictly inside `root` (not equal to root). Returns null on escape / empty.
 */
export function resolveUnderRoot(
  root: string,
  ...segments: string[]
): string | null {
  if (segments.some((segment) => segment.length === 0)) {
    return null
  }

  const resolvedRoot = path.resolve(root)
  const resolved = path.resolve(resolvedRoot, ...segments)
  const prefix = resolvedRoot.endsWith(path.sep)
    ? resolvedRoot
    : `${resolvedRoot}${path.sep}`

  if (resolved === resolvedRoot || !resolved.startsWith(prefix)) {
    return null
  }

  return resolved
}

export async function removePathIfExists(target: string): Promise<void> {
  await rm(target, { recursive: true, force: true })
}

export async function removeDirIfEmpty(dir: string): Promise<void> {
  try {
    const entries = await readdir(dir)
    if (entries.length === 0) {
      await rmdir(dir)
    }
  } catch {
    // best-effort
  }
}
```

- [ ] **Step 2: Create the shared remove helper**

Create `apps/web/features/find/remove-github-repo.ts`:

```ts
import path from 'node:path'
import { FIND_MIRROR_ROOT } from '@/features/find/config/data'
import {
  readFindConfig,
  updateFindConfig,
} from '@/features/find/config/service'
import {
  removeDirIfEmpty,
  removePathIfExists,
  resolveUnderRoot,
} from '@/lib/fs'

export async function removeGitHubRepoFromConfigAndDisk(input: {
  id: string
  owner?: string
  repo?: string
}): Promise<void> {
  const config = await readFindConfig()
  const existing = config.githubRepos.find((item) => item.id === input.id)
  const owner = existing?.owner ?? input.owner
  const repo = existing?.repo ?? input.repo

  if (!owner || !repo) {
    return
  }

  const mirrorPath = resolveUnderRoot(FIND_MIRROR_ROOT, owner, repo)
  if (!mirrorPath) {
    throw new Error('Refusing to delete outside the Find mirror root.')
  }

  try {
    await removePathIfExists(mirrorPath)
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Could not delete local mirror: ${error.message}`
        : 'Could not delete local mirror.',
    )
  }

  const ownerDir = resolveUnderRoot(FIND_MIRROR_ROOT, owner)
  if (ownerDir) {
    await removeDirIfEmpty(ownerDir)
  }

  await updateFindConfig((current) => ({
    ...current,
    githubRepos: current.githubRepos.filter((item) => item.id !== input.id),
  }))
}
```

- [ ] **Step 3: Wire oRPC procedures**

In `apps/web/features/find/orpc.ts`:

1. Add import:

```ts
import { removeGitHubRepoFromConfigAndDisk } from '@/features/find/remove-github-repo'
```

2. Replace the `selected: false` branch inside `setGitHubRepoSelection` so the whole handler becomes:

```ts
  setGitHubRepoSelection: base
    .input(
      z.object({
        repo: z.object({
          id: z.string().min(1),
          owner: z.string().min(1),
          repo: z.string().min(1),
        }),
        selected: z.boolean(),
      }),
    )
    .output(z.void())
    .handler(async ({ input, errors }) => {
      const { repo, selected } = input

      if (!selected) {
        try {
          await removeGitHubRepoFromConfigAndDisk({
            id: repo.id,
            owner: repo.owner,
            repo: repo.repo,
          })
        } catch (error) {
          throw errors.BAD_REQUEST({
            message:
              error instanceof Error
                ? error.message
                : 'Could not remove repository.',
          })
        }
        return
      }

      await updateFindConfig((current) => {
        const existing = current.githubRepos.find((item) => item.id === repo.id)

        if (existing) {
          return current
        }

        const next: GitHubRepoSource = {
          id: repo.id,
          owner: repo.owner,
          repo: repo.repo,
          selectedAt: nowIso(),
          syncedAt: null,
          syncError: null,
        }

        return {
          ...current,
          githubRepos: [...current.githubRepos, next],
        }
      })
    }),
```

3. Add the new procedure on `findRouter` (place it immediately after `setGitHubRepoSelection`):

```ts
  removeGitHubRepo: base
    .input(z.object({ id: z.string().min(1) }))
    .output(z.void())
    .handler(async ({ input, errors }) => {
      try {
        await removeGitHubRepoFromConfigAndDisk({ id: input.id })
      } catch (error) {
        throw errors.BAD_REQUEST({
          message:
            error instanceof Error
              ? error.message
              : 'Could not remove repository.',
        })
      }
    }),
```

- [ ] **Step 4: Verify**

Run from repo root:

```bash
pnpm --filter web check-types && pnpm lint:fix && pnpm lint
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/fs.ts apps/web/features/find/remove-github-repo.ts apps/web/features/find/orpc.ts
git commit -m "$(cat <<'EOF'
feat(find): remove GitHub repos from config and disk

EOF
)"
```

---

### Task 2: Trash button on the mirror sync card

**Files:**
- Modify: `apps/web/components/find/github-mirror-sync-card.tsx`

**Interfaces:**
- Consumes: `orpc.find.removeGitHubRepo.mutationOptions` (Task 1); existing `orpc.find.getConfig` / `syncSelectedGitHubRepos`.
- Produces: Each saved-repo row shows a trash icon; clicking removes that repo via `removeGitHubRepo` and refreshes config + search.

- [ ] **Step 1: Replace `github-mirror-sync-card.tsx` with wired trash UI**

Replace the full contents of `apps/web/components/find/github-mirror-sync-card.tsx` with:

```tsx
'use client'

import { Button } from '@repo/ui/components/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@repo/ui/components/empty'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { orpc } from '@/lib/orpc/client'

export function GitHubMirrorSyncCard() {
  const queryClient = useQueryClient()

  const { data: githubRepos } = useQuery(
    orpc.find.getConfig.queryOptions({
      select: (data) => data.githubRepos,
    }),
  )

  const [syncMessages, setSyncMessages] = useState<Record<string, string>>({})

  const syncMutation = useMutation(
    orpc.find.syncSelectedGitHubRepos.mutationOptions({
      onSuccess: async (results) => {
        setSyncMessages(
          Object.fromEntries(
            results.map((result) => [
              result.id,
              result.ok ? 'Synced' : `Failed: ${result.message}`,
            ]),
          ),
        )
        await queryClient.invalidateQueries({
          queryKey: orpc.find.getConfig.key(),
        })
        await queryClient.invalidateQueries({
          queryKey: orpc.find.search.key(),
        })
      },
    }),
  )

  const removeMutation = useMutation(
    orpc.find.removeGitHubRepo.mutationOptions({
      onSuccess: async (_data, { id }) => {
        setSyncMessages((current) => {
          const next = { ...current }
          delete next[id]
          return next
        })
        await queryClient.invalidateQueries({
          queryKey: orpc.find.getConfig.key(),
        })
        await queryClient.invalidateQueries({
          queryKey: orpc.find.search.key(),
        })
      },
    }),
  )

  const busy = syncMutation.isPending || removeMutation.isPending

  return (
    <Card>
      <CardHeader>
        <CardTitle>GitHub mirror sync</CardTitle>
      </CardHeader>
      <CardContent className='grid gap-3'>
        <Button
          type='button'
          disabled={!githubRepos?.length || busy}
          onClick={() => syncMutation.mutate()}
        >
          {syncMutation.isPending ? 'Syncing...' : 'Sync selected repositories'}
        </Button>

        {githubRepos?.length ? (
          <div className='grid gap-2'>
            {githubRepos.map((repo) => (
              <div
                key={repo.id}
                className='flex items-start justify-between gap-3 rounded-md border p-3'
              >
                <div className='min-w-0'>
                  <p className='font-mono text-xs'>
                    {repo.owner}/{repo.repo}
                  </p>
                  <p className='text-xs text-muted-foreground mt-1'>
                    {syncMessages[repo.id] ?? 'Idle'}
                  </p>
                </div>
                <Button
                  variant='ghost'
                  size='icon-sm'
                  disabled={busy}
                  onClick={() => removeMutation.mutate({ id: repo.id })}
                >
                  <Trash2Icon />
                  <span className='sr-only'>
                    Remove {repo.owner}/{repo.repo}
                  </span>
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No GitHub repos selected yet</EmptyTitle>
              <EmptyDescription>
                Search GitHub repos on the left and check the ones you want to
                include.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
    </Card>
  )
}
```

Notes:
- Layout matches local-root trash rows in `find-workspace.tsx` (`ghost` + `icon-sm` + `Trash2Icon` + `sr-only`).
- `FindWorkspace` checkbox uncheck needs **no client change** — server `setGitHubRepoSelection(false)` now wipes disk.

- [ ] **Step 2: Verify**

Run from repo root:

```bash
pnpm --filter web check-types && pnpm lint:fix && pnpm lint
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/find/github-mirror-sync-card.tsx
git commit -m "$(cat <<'EOF'
feat(find): add trash control for saved GitHub mirrors

EOF
)"
```

---

### Task 3: Manual verification

**Files:**
- None (manual only)

**Interfaces:**
- Consumes: Tasks 1–2 end-to-end on `/find`.
- Produces: Confirmed behavior against the spec verification list.

- [ ] **Step 1: Start the web app**

```bash
pnpm --filter web dev
```

Open `http://localhost:3000/find`.

- [ ] **Step 2: Trash after sync**

1. Load a GitHub user/org, check one small public repo, click **Sync selected repositories**.
2. Confirm the mirror exists: `ls ~/.crispy-code/repos/<owner>/<repo>`.
3. Click the trash icon on that row.
4. Expected: row disappears; `ls` shows the folder gone (and empty owner dir cleaned up if it was the last repo); search no longer lists that source.

- [ ] **Step 3: Uncheck path**

1. Select the same (or another) repo again via checkbox; sync optional.
2. Uncheck it in the Sources lookup list.
3. Expected: removed from sync card list; mirror directory gone if it existed.

- [ ] **Step 4: Unsynced delete + idempotence**

1. Select a repo but do **not** sync; trash it → config cleared, no error.
2. Trash / uncheck an already-removed id path (re-select then immediately trash twice if needed) → no error.

- [ ] **Step 5: Final commit if verification prompted fixes**

If any fix commits were needed during verification, ensure the working tree is clean:

```bash
git status
```

Expected: clean (or only unrelated files). No empty commit.

---

## Spec coverage checklist

| Spec requirement | Task |
|---|---|
| Shared helper for trash + uncheck | Task 1 |
| `find.removeGitHubRepo` procedure | Task 1 |
| `setGitHubRepoSelection(false)` wipes disk | Task 1 |
| Path stays under `FIND_MIRROR_ROOT` | Task 1 (`resolveUnderRoot`) |
| Delete mirror then config; keep config on delete failure | Task 1 |
| Best-effort empty owner dir | Task 1 |
| Idempotent missing config / missing mirror | Task 1 |
| Trash UI on sync card | Task 2 |
| Invalidate config + search | Task 2 |
| Uncheck client unchanged | Task 2 note |
| No confirm dialog | Tasks 1–2 |
| Manual verification cases | Task 3 |
