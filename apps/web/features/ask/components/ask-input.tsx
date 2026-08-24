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
import { useParams, useRouter } from 'next/navigation'
import { useAskConfigStatus } from '@/features/ask/hooks'
import { orpc } from '@/lib/orpc/client'

export function AskInput() {
  const { threadId } = useParams<{ threadId?: string }>()
  const router = useRouter()

  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation(
    orpc.ask.start.mutationOptions({
      onSuccess: async (data) => {
        await queryClient.invalidateQueries({
          queryKey: orpc.ask.listThreads.key(),
        })

        if (data.threadId !== threadId) {
          router.push(`/ask/${data.threadId}`)
          return
        }

        await queryClient.invalidateQueries({
          queryKey: orpc.ask.getThread.key({
            input: { threadId: data.threadId },
          }),
        })
      },
      onError: () => {
        // TODO: Setup toast notifications
      },
    }),
  )

  const configStatus = useAskConfigStatus()

  const { data: isRunning } = useQuery(
    orpc.ask.getThread.queryOptions({
      enabled: !!threadId,
      input: threadId ? { threadId } : skipToken,
      select: (data) => data.turns.some((turn) => turn.status === 'RUNNING'),
    }),
  )

  return (
    <form
      className='sticky bottom-4'
      onSubmit={(event) => {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        const question = String(formData.get('question') ?? '').trim()
        if (!question || isPending || isRunning || !configStatus.ok) return
        mutate({ question, threadId })
      }}
    >
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
