import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc/client'

export function useAskConfigStatus() {
  const { data: geminiConfigured = true } = useQuery(
    orpc.ask.status.queryOptions({
      select: (data) => data.geminiConfigured,
    }),
  )

  const { data: localRoots } = useQuery(
    orpc.find.getConfig.queryOptions({
      select: (data) => data.localRoots,
    }),
  )

  const hasLocalRootFolders = !(localRoots !== undefined && !localRoots.length)

  return {
    ok: geminiConfigured && hasLocalRootFolders,
    geminiConfigured,
    hasLocalRootFolders,
  }
}
