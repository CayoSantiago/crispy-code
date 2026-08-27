'use client'

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@repo/ui/components/input-group'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowUpIcon, LoaderCircleIcon, SparklesIcon } from 'lucide-react'
import { useAskConfigStatus } from '@/features/ask/hooks'
import { orpc } from '@/lib/orpc/client'

export function AskThreadInput({ threadId }: { threadId: string }) {
  const queryClient = useQueryClient()
  const configStatus = useAskConfigStatus()
  const { data: isRunning = false } = useQuery(
    orpc.ask.getThread.queryOptions({
      input: { threadId },
      select: (data) => data.turns.some((turn) => turn.status === 'RUNNING'),
    }),
  )
  const { mutate, isPending, error } = useMutation(
    orpc.ask.start.mutationOptions({
      onSuccess: async (data) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: orpc.ask.listThreads.key(),
          }),
          queryClient.invalidateQueries({
            queryKey: orpc.ask.getThread.key({
              input: { threadId: data.threadId },
            }),
          }),
        ])
      },
    }),
  )

  const disabled = isPending || isRunning || !configStatus.ok

  const handleSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (disabled) return

    const question = String(
      new FormData(event.currentTarget).get('question') ?? '',
    ).trim()
    if (!question) return

    mutate({ question, threadId })
    event.currentTarget.reset()
  }

  return (
    <div className='grid gap-2'>
      <form onSubmit={handleSubmit}>
        <InputGroup className='h-9 rounded-full bg-card'>
          <InputGroupInput
            name='question'
            placeholder={
              isRunning
                ? 'Wait for the current answer…'
                : 'Ask a follow-up question…'
            }
            autoComplete='off'
            disabled={disabled}
          />
          <InputGroupAddon align='inline-start' className='pl-[11px]!'>
            <SparklesIcon />
          </InputGroupAddon>
          <InputGroupAddon align='inline-end' className='pr-[11px]'>
            <InputGroupButton
              type='submit'
              variant='default'
              size='icon-xs'
              className='rounded-full'
              disabled={disabled}
              aria-label='Ask'
            >
              {isPending ? (
                <LoaderCircleIcon className='animate-spin' />
              ) : (
                <ArrowUpIcon />
              )}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </form>
      {error ? (
        <p className='text-xs text-destructive'>{error.message}</p>
      ) : null}
    </div>
  )
}
