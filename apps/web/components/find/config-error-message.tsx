'use client'

import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc/client'

export function ConfigErrorMessage() {
  const configQuery = useQuery(orpc.find.getConfig.queryOptions())

  if (!configQuery.isError) return null

  return (
    <em role='alert' className='text-xs font-medium text-destructive'>
      Failed to load your sources: {configQuery.error?.message}
    </em>
  )
}
