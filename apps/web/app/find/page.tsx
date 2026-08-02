import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query'
import { FindWorkspace } from '@/components/find/find-workspace'
import { orpc } from '@/lib/orpc/client'
import '@/lib/orpc/client.server'

export default async function FindPage() {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery(orpc.find.getConfig.queryOptions())

  return (
    <div className='grid gap-6 w-full'>
      <h1 className='text-3xl font-semibold tracking-tight'>Code Finder</h1>

      <HydrationBoundary state={dehydrate(queryClient)}>
        <FindWorkspace />
      </HydrationBoundary>
    </div>
  )
}
