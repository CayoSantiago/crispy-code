'use client'

import { Button } from '@repo/ui/components/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@repo/ui/components/empty'
import { TriangleAlertIcon } from 'lucide-react'

export default function GitError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    <Empty className='border rounded-md bg-card'>
      <EmptyHeader>
        <EmptyMedia variant='icon'>
          <TriangleAlertIcon />
        </EmptyMedia>
        <EmptyTitle>Could not load from GitHub</EmptyTitle>
        <EmptyDescription>{error.message}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={() => unstable_retry()}>Try again</Button>
      </EmptyContent>
    </Empty>
  )
}
