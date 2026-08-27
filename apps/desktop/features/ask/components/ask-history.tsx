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
import { useParams, useRouter } from 'next/navigation'
import { useLayoutEffect, useRef, useState } from 'react'
import { orpc } from '@/lib/orpc/client'

export function AskHistory() {
  const { threadId } = useParams<{ threadId?: string }>()
  const router = useRouter()
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const ignoreBlurRef = useRef(false)
  const restoreFocusRef = useRef(false)
  const selectOnFocusRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { data: threads } = useSuspenseQuery(
    orpc.ask.listThreads.queryOptions(),
  )

  const deleteMutation = useMutation(
    orpc.ask.deleteThread.mutationOptions({
      meta: {
        invalidatesQuery: orpc.ask.listThreads.key(),
      },
      onSuccess: (_, variables) => {
        if (variables.threadId === threadId) router.push('/ask')
      },
    }),
  )
  const renameMutation = useMutation(
    orpc.ask.renameThread.mutationOptions({
      meta: {
        invalidatesQuery: orpc.ask.listThreads.key(),
      },
      onSuccess: (_, variables) => {
        ignoreBlurRef.current = false
        setRenamingId((id) => (id === variables.threadId ? null : id))
      },
      onError: () => {
        ignoreBlurRef.current = false
        restoreFocusRef.current = true
      },
    }),
  )

  useLayoutEffect(() => {
    if (
      !renameMutation.isPending &&
      renamingId !== null &&
      restoreFocusRef.current
    ) {
      restoreFocusRef.current = false
      inputRef.current?.focus()
    }
  }, [renameMutation.isPending, renamingId])

  function cancelRename() {
    if (renameMutation.isPending) return
    ignoreBlurRef.current = false
    setRenamingId(null)
  }

  function startRename(thread: { id: string; title: string }) {
    if (renameMutation.isPending) return
    ignoreBlurRef.current = false
    selectOnFocusRef.current = true
    setRenamingId(thread.id)
    setDraft(thread.title)
  }

  function saveRename(thread: { id: string; title: string }) {
    if (renameMutation.isPending) return
    const title = draft.trim()
    if (!title || title === thread.title) {
      cancelRename()
      return
    }
    ignoreBlurRef.current = true
    renameMutation.mutate({ threadId: thread.id, title })
  }

  if (!threads.length) {
    return (
      <p className='px-1 text-muted-foreground text-xs'>No Ask threads yet</p>
    )
  }

  return threads.map((thread) => {
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
                ref={inputRef}
                value={draft}
                maxLength={80}
                disabled={renameMutation.isPending}
                autoFocus
                aria-label='Ask thread title'
                className='h-5 min-w-0 flex-1 border-0 bg-transparent px-0 font-medium text-xs shadow-none focus-visible:ring-0 disabled:opacity-100'
                onChange={(event) => setDraft(event.target.value)}
                onFocus={(event) => {
                  if (selectOnFocusRef.current) {
                    selectOnFocusRef.current = false
                    event.target.select()
                  }
                }}
                onClick={(event) => event.stopPropagation()}
                onBlur={() => {
                  if (ignoreBlurRef.current || renameMutation.isPending) return
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
              <span className='min-w-0 truncate font-medium text-xs'>
                {thread.title}
              </span>
            )}
            <span className='ml-auto shrink-0 text-[0.625rem] text-muted-foreground'>
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
                      'Delete this Ask thread? This cannot be undone.',
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
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h`

  return `${Math.round(hours / 24)}d`
}
