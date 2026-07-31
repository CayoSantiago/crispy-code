import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@repo/ui/components/empty'
import { ClockIcon } from 'lucide-react'

export function RateLimitNotice({ resetAt }: { resetAt: Date | null }) {
  return (
    <Empty className='border rounded-md bg-card'>
      <EmptyHeader>
        <EmptyMedia variant='icon'>
          <ClockIcon />
        </EmptyMedia>
        <EmptyTitle>GitHub rate limit reached</EmptyTitle>
        <EmptyDescription>
          {resetAt
            ? `Unauthenticated requests are capped at 60 per hour. The limit resets at ${resetAt.toLocaleTimeString()}.`
            : 'Unauthenticated requests are capped at 60 per hour. Try again shortly.'}
          {' Set GITHUB_TOKEN to raise the cap to 5,000 per hour.'}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
