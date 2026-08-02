import { Skeleton } from '@repo/ui/components/skeleton'

export default function FindLoading() {
  return (
    <div className='grid gap-6 w-full'>
      <Skeleton className='h-9 w-64' />
      <div className='grid gap-6 lg:grid-cols-2'>
        <Skeleton className='h-72 w-full' />
        <Skeleton className='h-72 w-full' />
      </div>
      <Skeleton className='h-64 w-full' />
    </div>
  )
}
