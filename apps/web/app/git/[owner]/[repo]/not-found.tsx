import { Button } from '@repo/ui/components/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@repo/ui/components/empty'
import { SearchXIcon } from 'lucide-react'
import Link from 'next/link'

export default function RepoNotFound() {
  return (
    <Empty className='border rounded-md bg-card'>
      <EmptyHeader>
        <EmptyMedia variant='icon'>
          <SearchXIcon />
        </EmptyMedia>
        <EmptyTitle>Not found on GitHub</EmptyTitle>
        <EmptyDescription>
          That repository or commit does not exist, or it is private.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button nativeButton={false} render={<Link href='/git' />}>
          Try another repository
        </Button>
      </EmptyContent>
    </Empty>
  )
}
