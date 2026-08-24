'use client'

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@repo/ui/components/input-group'
import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { ArrowUpIcon, LoaderCircleIcon, SparklesIcon } from 'lucide-react'
import { useAskConfigStatus } from '@/features/ask/hooks'
import { orpc } from '@/lib/orpc/client'

export function AskThreadInput({ threadId }: { threadId: string }) {
  const queryClient = useQueryClient()

  const configStatus = useAskConfigStatus()

  const { mutate, isPending } = useMutation(
    orpc.ask.start.mutationOptions({
      onSuccess: async (data) => {
        await queryClient.invalidateQueries({
          queryKey: orpc.ask.listThreads.key(),
        })

        await queryClient.invalidateQueries({
          queryKey: orpc.ask.getThread.key({
            input: { threadId: data.threadId },
          }),
        })
      },
    }),
  )

  const { data: isRunning } = useQuery(
    orpc.ask.getThread.queryOptions({
      enabled: !!threadId,
      input: threadId ? { threadId } : skipToken,
      select: (data) => data.turns.some((turn) => turn.status === 'RUNNING'),
    }),
  )

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (isPending || isRunning || !configStatus.ok) return

    const formData = new FormData(e.currentTarget)

    const question = String(formData.get('question') ?? '').trim()
    if (!question) return

    mutate({ question, threadId })

    e.currentTarget.reset()
  }

  return (
    <form className='pb-4' onSubmit={handleSubmit}>
      <InputGroup className='h-9 bg-card rounded-full'>
        <InputGroupInput
          name='question'
          placeholder='Find a date picker, or describe a problem…'
          autoComplete='off'
          disabled={!configStatus.ok}
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
            disabled={!configStatus.ok}
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
  )
}
