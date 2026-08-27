import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc/client'

export function useAskConfigStatus() {
  const { data: geminiConfigured, isPending: geminiPending } = useQuery(
    orpc.ask.status.queryOptions({
      select: (data) => data.geminiConfigured,
    }),
  )

  const { data: localRoots, isPending: localRootsPending } = useQuery(
    orpc.find.getConfig.queryOptions({
      select: (data) => data.localRoots,
    }),
  )

  const configured = geminiConfigured ?? false
  const hasLocalRootFolders = (localRoots?.length ?? 0) > 0

  return {
    ok: configured && hasLocalRootFolders,
    loading: geminiPending || localRootsPending,
    geminiConfigured: configured,
    hasLocalRootFolders,
  }
}
