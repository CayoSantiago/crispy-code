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

  const { mutate, isPending } = useMutation(
    orpc.ask.start.mutationOptions({
      meta: { invalidatesQuery: orpc.ask.listThreads.key() },
      onSuccess: async (data) => router.push(`/ask/${data.threadId}`),
    }),
  )

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (isPending || !configStatus.ok) return

    const formData = new FormData(e.currentTarget)

    const question = String(formData.get('question') ?? '').trim()
    if (!question) return

    mutate({ question })

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
