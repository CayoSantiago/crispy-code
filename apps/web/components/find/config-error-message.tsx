'use client'

import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc/client'

export function ConfigErrorMessage() {
  const configQuery = useQuery(orpc.find.getConfig.queryOptions())

  if (!configQuery.isError) return null

  return (
    <div className='rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs'>
      Failed to load your sources: {configQuery.error.message}
    </div>
  )
}
