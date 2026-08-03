'use client'

import { Button } from '@repo/ui/components/button'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { SearchPanel } from '@/components/find/search-panel'
import { SourcesSheet } from '@/components/find/sources-sheet'
import { orpc } from '@/lib/orpc/client'

export function FindWorkspace() {
  const configQuery = useQuery(orpc.find.getConfig.queryOptions())
  const [sourcesOpen, setSourcesOpen] = useState(false)

  return (
    <>
      <div className='flex items-baseline justify-between gap-4'>
        <h1 className='text-3xl font-semibold tracking-tight'>Code Finder</h1>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='text-muted-foreground'
          onClick={() => setSourcesOpen(true)}
        >
          Sources
        </Button>
      </div>

      {configQuery.isError ? (
        <div className='rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs'>
          Failed to load your sources: {configQuery.error.message}
        </div>
      ) : null}

      <SearchPanel onOpenSources={() => setSourcesOpen(true)} />

      <SourcesSheet open={sourcesOpen} onOpenChange={setSourcesOpen} />
    </>
  )
}
