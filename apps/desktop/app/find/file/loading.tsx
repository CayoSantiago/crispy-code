import { Skeleton } from '@repo/ui/components/skeleton'

export default function FindFileLoading() {
  return (
    <div className='grid w-full gap-4'>
      <Skeleton className='h-10 w-96' />
      <Skeleton className='h-96 w-full' />
    </div>
  )
}
