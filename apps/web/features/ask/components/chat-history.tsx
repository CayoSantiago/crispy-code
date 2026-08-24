'use client'

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@repo/ui/components/context-menu'
import { SidebarMenuButton, SidebarMenuItem } from '@repo/ui/components/sidebar'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import router from 'next/router'
import { orpc } from '@/lib/orpc/client'

export function ChatHistory() {
  const { threadId } = useParams<{ threadId?: string }>()

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

  if (!chats.length) {
    return <p className='text-xs text-muted-foreground px-1'>No chats yet</p>
  }

  return chats.map((thread) => (
    <SidebarMenuItem key={thread.id}>
      <ContextMenu>
        <ContextMenuTrigger
          render={
            <SidebarMenuButton render={<Link href={`/ask/${thread.id}`} />} />
          }
        >
          <span className='truncate text-xs font-medium min-w-0'>
            {thread.title}
          </span>
          <span className='text-[0.625rem] text-muted-foreground shrink-0 ml-auto'>
            {formatRelativeTime(thread.updatedAt)}
          </span>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuGroup>
            <ContextMenuItem
              onClick={() => {
                if (
                  window.confirm('Delete this chat? This cannot be undone.')
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
  ))
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
