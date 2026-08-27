'use client'

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@repo/ui/components/input-group'
import { useMutation } from '@tanstack/react-query'
import { ArrowUpIcon, LoaderCircleIcon, SparklesIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAskConfigStatus } from '@/features/ask/hooks'
import { orpc } from '@/lib/orpc/client'

export function AskInput() {
  const router = useRouter()
  const configStatus = useAskConfigStatus()
  const { mutate, isPending, error } = useMutation(
    orpc.ask.start.mutationOptions({
      meta: { invalidatesQuery: orpc.ask.listThreads.key() },
      onSuccess: (data) => router.push(`/ask/${data.threadId}`),
    }),
  )

  const handleSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    event.stopPropagation()

    if (isPending || !configStatus.ok) return

    const question = String(
      new FormData(event.currentTarget).get('question') ?? '',
    ).trim()
    if (!question) return

    mutate({ question })
    event.currentTarget.reset()
  }

  return (
    <div className='grid gap-2'>
      <form onSubmit={handleSubmit}>
        <InputGroup className='h-9 rounded-full bg-card'>
          <InputGroupInput
            name='question'
            placeholder='Find a date picker, or describe a problem…'
            autoComplete='off'
            disabled={!configStatus.ok || isPending}
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
              disabled={!configStatus.ok || isPending}
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
