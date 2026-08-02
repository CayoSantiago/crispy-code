import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query'
import { FindWorkspace } from '@/components/find/find-workspace'
import { readFindConfig } from '@/features/find/config/service'
import { findKeys } from '@/features/find/keys'

export default async function FindPage() {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: findKeys.config(),
    queryFn: readFindConfig,
  })

  return (
    <div className='grid gap-6 w-full'>
      <h1 className='text-3xl font-semibold tracking-tight'>Code Finder</h1>

      <HydrationBoundary state={dehydrate(queryClient)}>
        <FindWorkspace />
      </HydrationBoundary>
    </div>
  )
}
