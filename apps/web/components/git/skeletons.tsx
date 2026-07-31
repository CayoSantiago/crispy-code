import { Skeleton } from '@repo/ui/components/skeleton'

export function BreadcrumbSkeleton() {
  return <Skeleton className='h-5 w-40' />
}

export function RepoHeaderSkeleton() {
  return (
    <div className='grid gap-2 w-full'>
      <Skeleton className='h-8 w-64' />
      <Skeleton className='h-4 w-full max-w-md' />
    </div>
  )
}

export function CommitListSkeleton() {
  return (
    <div className='grid gap-2 w-full'>
      {[0, 1, 2, 3, 4].map((row) => (
        <Skeleton key={row} className='h-16 w-full' />
      ))}
    </div>
  )
}

export function CommitDetailSkeleton() {
  return (
    <div className='grid gap-4 w-full'>
      <Skeleton className='h-24 w-full' />
      <Skeleton className='h-64 w-full' />
      <Skeleton className='h-64 w-full' />
    </div>
  )
}
