# Rename Ask Thread Titles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a signed-in user rename an Ask thread from the sidebar history context menu, persisting the title without moving the thread in the list.

**Architecture:** Add `ask.renameThread` beside `deleteThread`. It trims and caps the title, writes it, and sets `updatedAt` to the stored value so list order does not change. `ChatHistory` keeps local edit state, swaps the title for an input, and invalidates `listThreads` on success.

**Tech Stack:** Next.js App Router, oRPC, Prisma/`AskThread`, TanStack Query, `@repo/ui` ContextMenu + Sidebar + Input.

## Global Constraints

- Procedure name is `renameThread` on `askRouter`; input `{ threadId, title }`; output `{ ok: true }`.
- Title: trim, at least one character, maximum 80 characters, not ellipsized (do not reuse `threadTitleFromQuestion`).
- Missing or foreign thread: `NOT_FOUND` with message `Chat not found.` Unauthenticated: `FORBIDDEN` with message `Sign in to ask about your local code.`
- Rename must not bump `updatedAt` or change `listThreads` order (ordered by `updatedAt` desc).
- **Rename** sits above **Delete**. Only the context menu starts rename. Enter saves; Escape and blur cancel. Blank/whitespace title cancels. Unchanged title does not call the server.
- While a save is in flight, ignore blur and Escape. On failure, stay in edit mode with the draft. No toast. No optimistic cache write. Invalidate `listThreads` on success.
- The editing row is not a `Link`. Do not extract `ChatHistoryItem`. Do not add a test runner or automated tests. Verification is `pnpm --filter web check-types` plus the sidebar checklist in Task 2.

## File map

- Modify `apps/web/features/ask/schemas.ts` — `askRenameThreadInputSchema` / `askRenameThreadOutputSchema` (trim, min 1, max 80).
- Modify `apps/web/features/ask/orpc.ts` — `renameThread` procedure. Router already exposes `askRouter` as `appRouter.ask`; no router file change.
- Modify `apps/web/features/ask/components/chat-history.tsx` — Rename menu item, inline input, mutation.

No new files.

---

### Task 1: `renameThread` procedure

**Files:**
- Modify: `apps/web/features/ask/schemas.ts`
- Modify: `apps/web/features/ask/orpc.ts`
- Test: none (no runner; typecheck only)

**Interfaces:**
- Consumes: `base` oRPC builder; `db.askThread`; existing `FORBIDDEN` / `NOT_FOUND` error shape from `deleteThread`.
- Produces: `askRenameThreadInputSchema` (`{ threadId: string, title: string }` after trim); `askRenameThreadOutputSchema` (`{ ok: true }`); `askRouter.renameThread`.

- [ ] **Step 1: Add the rename schemas**

In `apps/web/features/ask/schemas.ts`, add these immediately after `askThreadSummarySchema` (before `askStartInputSchema`):

```ts
export const askRenameThreadInputSchema = z.object({
  threadId: z.string().min(1),
  title: z.string().trim().min(1).max(80),
})

export const askRenameThreadOutputSchema = z.object({
  ok: z.literal(true),
})
```

Do not export extra types unless something in this change needs them. `z.string().trim()` matches `askStartInputSchema`. Empty-after-trim and over-80 fail this schema (oRPC rejects them before the handler).

- [ ] **Step 2: Add `renameThread` on the ask router**

In `apps/web/features/ask/orpc.ts`, add `askRenameThreadInputSchema` and `askRenameThreadOutputSchema` to the existing `@/features/ask/schemas` import.

Insert this procedure on `askRouter` immediately after `deleteThread` and before `realtimeToken`:

```ts
  renameThread: base
    .input(askRenameThreadInputSchema)
    .output(askRenameThreadOutputSchema)
    .handler(async ({ context, input, errors }) => {
      if (!context.user) {
        throw errors.FORBIDDEN({
          message: 'Sign in to ask about your local code.',
        })
      }

      const thread = await db.askThread.findFirst({
        where: { id: input.threadId, userId: context.user.id },
        select: { id: true, updatedAt: true },
      })

      if (!thread) {
        throw errors.NOT_FOUND({ message: 'Chat not found.' })
      }

      await db.askThread.update({
        where: { id: thread.id },
        data: {
          title: input.title,
          updatedAt: thread.updatedAt,
        },
      })

      return { ok: true as const }
    }),
```

Passing the existing `updatedAt` is required: `AskThread.updatedAt` is `@updatedAt`, so a title-only update would otherwise move the row to the top of `listThreads`. Prisma uses the value you pass instead of `now()`. `input.title` is already trimmed by the schema.

Do not call `threadTitleFromQuestion` here.

- [ ] **Step 3: Typecheck**

Run:

```bash
pnpm --filter web check-types
```

Expected: exit code 0, no errors. If Prisma rejects `updatedAt` on `update`, stop and fix the type — do not drop the field; list order depends on it.

- [ ] **Step 4: Commit**

```bash
git add apps/web/features/ask/schemas.ts apps/web/features/ask/orpc.ts
git commit -m "$(cat <<'EOF'
Add renameThread so Ask titles can change without reordering.

EOF
)"
```

---

### Task 2: Inline rename in `ChatHistory`

**Files:**
- Modify: `apps/web/features/ask/components/chat-history.tsx`
- Test: none (typecheck + sidebar checklist)

**Interfaces:**
- Consumes: `orpc.ask.renameThread.mutationOptions` with input `{ threadId: string, title: string }` and output `{ ok: true }`; `orpc.ask.listThreads.key()` for invalidation; `@repo/ui` `Input`.
- Produces: sidebar **Rename** above **Delete**; inline title editing for one row at a time.

- [ ] **Step 1: Replace `chat-history.tsx` with the rename-capable list**

Write this full file to `apps/web/features/ask/components/chat-history.tsx` (keep `formatRelativeTime` and the existing `next/router` delete redirect; do not refactor those):

```tsx
'use client'

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@repo/ui/components/context-menu'
import { Input } from '@repo/ui/components/input'
import { SidebarMenuButton, SidebarMenuItem } from '@repo/ui/components/sidebar'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import router from 'next/router'
import { useRef, useState } from 'react'
import { orpc } from '@/lib/orpc/client'

export function ChatHistory() {
  const { threadId } = useParams<{ threadId?: string }>()
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const ignoreBlurRef = useRef(false)

  const { data: chats } = useSuspenseQuery(orpc.ask.listThreads.queryOptions())

  const deleteMutation = useMutation(
    orpc.ask.deleteThread.mutationOptions({
      meta: {
        invalidatesQuery: orpc.ask.listThreads.key(),
      },
      onSuccess: async (_, variables) => {
        if (variables.threadId === threadId) router.push('/ask')
      },
    }),
  )

  const renameMutation = useMutation(
    orpc.ask.renameThread.mutationOptions({
      meta: {
        invalidatesQuery: orpc.ask.listThreads.key(),
      },
      onSuccess: () => {
        ignoreBlurRef.current = false
        setRenamingId(null)
      },
      onError: () => {
        ignoreBlurRef.current = false
      },
    }),
  )

  function cancelRename() {
    if (renameMutation.isPending) {
      return
    }
    ignoreBlurRef.current = false
    setRenamingId(null)
  }

  function startRename(thread: { id: string; title: string }) {
    ignoreBlurRef.current = false
    setRenamingId(thread.id)
    setDraft(thread.title)
  }

  function saveRename(thread: { id: string; title: string }) {
    const title = draft.trim()
    if (!title || title === thread.title) {
      cancelRename()
      return
    }
    ignoreBlurRef.current = true
    renameMutation.mutate({ threadId: thread.id, title })
  }

  if (!chats.length) {
    return <p className='text-xs text-muted-foreground px-1'>No chats yet</p>
  }

  return chats.map((thread) => {
    const isRenaming = renamingId === thread.id

    return (
      <SidebarMenuItem key={thread.id}>
        <ContextMenu>
          <ContextMenuTrigger
            render={
              isRenaming ? (
                <SidebarMenuButton type='button' />
              ) : (
                <SidebarMenuButton
                  render={<Link href={`/ask/${thread.id}`} />}
                />
              )
            }
          >
            {isRenaming ? (
              <Input
                value={draft}
                maxLength={80}
                disabled={renameMutation.isPending}
                autoFocus
                aria-label='Thread title'
                className='h-5 min-w-0 flex-1 border-0 bg-transparent px-0 text-xs font-medium shadow-none focus-visible:ring-0'
                onChange={(event) => setDraft(event.target.value)}
                onFocus={(event) => event.target.select()}
                onClick={(event) => event.stopPropagation()}
                onBlur={() => {
                  if (ignoreBlurRef.current || renameMutation.isPending) {
                    return
                  }
                  cancelRename()
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    saveRename(thread)
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    cancelRename()
                  }
                }}
              />
            ) : (
              <span className='truncate text-xs font-medium min-w-0'>
                {thread.title}
              </span>
            )}
            <span className='text-[0.625rem] text-muted-foreground shrink-0 ml-auto'>
              {formatRelativeTime(thread.updatedAt)}
            </span>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuGroup>
              <ContextMenuItem onClick={() => startRename(thread)}>
                Rename
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => {
                  if (
                    window.confirm(
                      'Delete this chat? This cannot be undone.',
                    )
                  ) {
                    deleteMutation.mutate({ threadId: thread.id })
                  }
                }}
              >
                Delete
              </ContextMenuItem>
            </ContextMenuGroup>
          </ContextMenuContent>
        </ContextMenu>
      </SidebarMenuItem>
    )
  })
}

function formatRelativeTime(iso: string) {
  const deltaMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.max(0, Math.round(deltaMs / 60_000))
  if (minutes < 1) {
    return 'now'
  }
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.round(minutes / 60)
  if (hours < 24) {
    return `${hours}h`
  }
  const days = Math.round(hours / 24)
  return `${days}d`
}
```

`ignoreBlurRef` exists because Enter unmounts or blurs the input in the same tick as `mutate`, which would otherwise look like click-away and cancel. `startRename` on another row blurs the first input, which cancels that row, then the menu item starts the second.

- [ ] **Step 2: Typecheck**

Run:

```bash
pnpm --filter web check-types
```

Expected: exit code 0, no errors. Then:

```bash
pnpm exec biome check apps/web/features/ask/components/chat-history.tsx
```

Expected: exit code 0. If Biome wants wrapping/imports changed, apply its format and re-run until clean. Do not change behavior to silence lint.

- [ ] **Step 3: Verify in the Ask sidebar**

With the web app running (`pnpm --filter web dev` if it is not already), signed in, and at least two threads in History:

1. Right-click a thread: **Rename** is above **Delete**.
2. Choose **Rename**: the title becomes a focused, selected input; the row is not a link; relative time is still visible.
3. Edit the title and press Enter: the new title stays; the row is a link again; that thread does **not** jump to the top (compare to the neighbor that was above/below it).
4. Rename again, press Escape: previous title returns; no request needed.
5. Rename again, click away: previous title returns.
6. Rename again, clear the input, press Enter: previous title returns.
7. Rename again, press Enter without changing the text: previous title stays; no failed request / the row leaves edit mode.
8. Delete still confirms and removes the thread.

If the app is not running, start it and use the browser on `/ask`. Do not skip this step.

- [ ] **Step 4: Commit**

```bash
git add apps/web/features/ask/components/chat-history.tsx
git commit -m "$(cat <<'EOF'
Rename Ask threads inline from the history context menu.

EOF
)"
```
