'use client'

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@repo/ui/components/empty'
import { Spinner } from '@repo/ui/components/spinner'
import { useQuery } from '@tanstack/react-query'
import { LoaderCircleIcon } from 'lucide-react'
import type { AskTurn } from '@/features/ask/schemas'
import { SearchHitList } from '@/features/find/components/search-hit-list'
import { orpc } from '@/lib/orpc/client'

export function AskThread({ threadId }: { threadId: string }) {
  const { data, isPending, error } = useQuery(
    orpc.ask.getThread.queryOptions({ input: { threadId } }),
  )

  if (isPending) {
    return <Spinner />
  }

  if (error) {
    return (
      <p className='border-l-2 border-destructive/50 pl-3 text-xs text-destructive'>
        {error.message}
      </p>
    )
  }

  if (!data.turns.length) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Ask about your local code</EmptyTitle>
          <EmptyDescription>
            Find a component, or describe a problem and we will search your
            local folders.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className='grid grid-cols-1 gap-8'>
      {data.turns.map((turn) => (
        <AskTurnView key={turn.id} turn={turn} />
      ))}
    </div>
  )
}

function AskTurnView({ turn }: { turn: AskTurn }) {
  const searches = turn.plannedQueries
    .map((search) => search.query)
    .filter(Boolean)
    .join(', ')

  return (
    <article className='grid grid-cols-1 gap-3'>
      <p className='text-sm font-medium'>{turn.question}</p>

      {turn.status === 'RUNNING' ? (
        <p className='flex items-center gap-2 text-xs text-muted-foreground'>
          <LoaderCircleIcon className='size-3.5 animate-spin' />
          Asking…
        </p>
      ) : turn.status === 'FAILED' ? (
        <p className='border-l-2 border-destructive/50 pl-3 text-xs text-destructive'>
          {turn.error ?? 'This turn failed.'}
        </p>
      ) : null}

      {turn.answer ? (
        <div className='rounded-lg bg-card ring-1 ring-foreground/10 px-4 py-3'>
          <p className='text-sm whitespace-pre-wrap'>{turn.answer}</p>
        </div>
      ) : null}

      {turn.status === 'COMPLETED' && searches ? (
        <p className='text-xs text-muted-foreground'>
          Searched for: {searches}
        </p>
      ) : null}

      {turn.groups.length ? <SearchHitList groups={turn.groups} /> : null}

      {turn.status === 'COMPLETED' && !turn.groups.length ? (
        <p className='text-xs text-muted-foreground'>
          No matching code in local folders.
        </p>
      ) : null}
    </article>
  )
}
