import { Skeleton } from '@repo/ui/components/skeleton'

export default function CommitDetailSkeleton() {
  return (
    <div className='grid gap-4 w-full'>
      <Skeleton className='h-24 w-full' />
      <Skeleton className='h-64 w-full' />
      <Skeleton className='h-64 w-full' />
    </div>
  )
}
