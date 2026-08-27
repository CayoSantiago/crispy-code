'use client'

import { Bubble, BubbleContent } from '@repo/ui/components/bubble'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@repo/ui/components/collapsible'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@repo/ui/components/empty'
import { Marker, MarkerContent, MarkerIcon } from '@repo/ui/components/marker'
import { Message, MessageContent } from '@repo/ui/components/message'
import { MessageScrollerItem } from '@repo/ui/components/message-scroller'
import { Spinner } from '@repo/ui/components/spinner'
import { useQuery } from '@tanstack/react-query'
import { ChevronRightIcon, LoaderCircleIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAskTurnStream } from '@/features/ask/hooks/use-ask-turn-stream'
import { reconcileTurnAnswer } from '@/features/ask/reconcile-turn-answer'
import type { AskSearchStage, AskTurn } from '@/features/ask/schemas'
import { SearchHitList } from '@/features/find/components/search-hit-list'
import { orpc } from '@/lib/orpc/client'

const STAGE_LABEL: Record<AskSearchStage, string> = {
  PLANNING: 'Planning',
  SEARCHING: 'Searching',
  WRITING: 'Writing',
}

export function AskThread({ threadId }: { threadId: string }) {
  const { data, isPending, error } = useQuery(
    orpc.ask.getThread.queryOptions({ input: { threadId } }),
  )
  const runningTurnId = data?.turns.find(
    (turn) => turn.status === 'RUNNING',
  )?.id
  const streamedTurnId = useRef(runningTurnId)
  if (runningTurnId) {
    streamedTurnId.current = runningTurnId
  }
  const live = useAskTurnStream(runningTurnId)

  if (isPending) {
    return (
      <MessageScrollerItem messageId='ask-pending'>
        <Spinner />
      </MessageScrollerItem>
    )
  }

  if (error) {
    return (
      <MessageScrollerItem messageId='ask-error'>
        <p className='border-destructive/50 border-l-2 pl-3 text-destructive text-xs'>
          {error.message}
        </p>
      </MessageScrollerItem>
    )
  }

  if (!data.turns.length) {
    return <AskEmpty />
  }

  return (
    <>
      {data.turns.map((turn) => (
        <AskTurnItems
          key={turn.id}
          turn={turn}
          thinking={
            turn.id === streamedTurnId.current && turn.status !== 'FAILED'
              ? live.thinking
              : ''
          }
          liveAnswer={turn.id === streamedTurnId.current ? live.answer : ''}
        />
      ))}
    </>
  )
}

export function AskEmpty() {
  return (
    <MessageScrollerItem messageId='ask-empty'>
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Ask about your local code</EmptyTitle>
          <EmptyDescription>
            Find a component, or describe a problem and we will search your
            local folders.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </MessageScrollerItem>
  )
}

function AskTurnItems({
  turn,
  thinking,
  liveAnswer,
}: {
  turn: AskTurn
  thinking: string
  liveAnswer: string
}) {
  const stored = turn.answer ?? ''
  const answer = reconcileTurnAnswer(stored, liveAnswer)

  return (
    <>
      <MessageScrollerItem messageId={`${turn.id}-question`} scrollAnchor>
        <Message align='end'>
          <MessageContent>
            <Bubble variant='secondary' align='end'>
              <BubbleContent className='text-sm'>{turn.question}</BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>
      </MessageScrollerItem>

      <MessageScrollerItem messageId={`${turn.id}-assistant`}>
        <Message>
          <MessageContent className='gap-3'>
            <SearchProgress turn={turn} hasAnswer={Boolean(answer)} />
            <ThinkingBlock thinking={thinking} hasAnswer={Boolean(answer)} />
            {answer ? (
              <p className='whitespace-pre-wrap text-sm'>{answer}</p>
            ) : null}
            {turn.status === 'FAILED' ? (
              <p className='border-destructive/50 border-l-2 pl-3 text-destructive text-xs'>
                {turn.error ?? 'This Ask turn failed.'}
              </p>
            ) : null}
            {turn.status === 'COMPLETED' && turn.plannedQueries.length ? (
              <p className='text-muted-foreground text-xs'>
                Searched for:{' '}
                {turn.plannedQueries
                  .map((search) => search.query)
                  .filter(Boolean)
                  .join(', ')}
              </p>
            ) : null}
            {turn.groups.length ? <SearchHitList groups={turn.groups} /> : null}
            {turn.status === 'COMPLETED' && !turn.groups.length ? (
              <p className='text-muted-foreground text-xs'>
                No matching code in local folders.
              </p>
            ) : null}
          </MessageContent>
        </Message>
      </MessageScrollerItem>
    </>
  )
}

function SearchProgress({
  turn,
  hasAnswer,
}: {
  turn: AskTurn
  hasAnswer: boolean
}) {
  const showStage = turn.status === 'RUNNING' && !hasAnswer && turn.searchStage
  const showPlan = turn.status === 'RUNNING' && turn.plannedQueries.length > 0

  if (!showStage && !showPlan) {
    return null
  }

  return (
    <div className='grid gap-1'>
      {showStage && turn.searchStage ? (
        <Marker>
          <MarkerIcon>
            <LoaderCircleIcon className='animate-spin' />
          </MarkerIcon>
          <MarkerContent>{STAGE_LABEL[turn.searchStage]}</MarkerContent>
        </Marker>
      ) : null}
      {showPlan ? (
        <p className='text-muted-foreground text-xs'>
          {turn.plannedQueries
            .map((search) => search.query)
            .filter(Boolean)
            .join(', ')}
        </p>
      ) : null}
    </div>
  )
}

function ThinkingBlock({
  thinking,
  hasAnswer,
}: {
  thinking: string
  hasAnswer: boolean
}) {
  const [open, setOpen] = useState(true)
  const collapsedOnAnswer = useRef(false)

  useEffect(() => {
    if (hasAnswer && !collapsedOnAnswer.current) {
      collapsedOnAnswer.current = true
      setOpen(false)
    }
  }, [hasAnswer])

  if (!thinking) {
    return null
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className='flex items-center gap-1 text-muted-foreground text-xs'>
        <ChevronRightIcon className='size-3.5 transition-transform [[data-open]_&]:rotate-90' />
        Thinking
      </CollapsibleTrigger>
      <CollapsibleContent>
        <p className='whitespace-pre-wrap text-muted-foreground text-xs'>
          {thinking}
        </p>
      </CollapsibleContent>
    </Collapsible>
  )
}
