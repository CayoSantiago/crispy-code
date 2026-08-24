import '@/lib/orpc/client.server'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@repo/ui/components/empty'

export default function AskPage() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Ask about your local code</EmptyTitle>
        <EmptyDescription>
          Find a component, or describe a problem and we will search your local
          folders.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
