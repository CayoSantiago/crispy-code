'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { SearchChrome } from '@/components/find/search-chrome'
import { SearchResults } from '@/components/find/search-results'
import type { SearchMode, SearchResponse } from '@/features/find/schemas'
import { useDebounce } from '@/hooks/use-debounce'
import { orpc } from '@/lib/orpc/client'

export function SearchPanel({ onOpenSources }: { onOpenSources: () => void }) {
  const configQuery = useQuery(orpc.find.getConfig.queryOptions())

  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 220)
  const [mode, setMode] = useState<SearchMode>('literal')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [pathGlob, setPathGlob] = useState('')

  const searchInput = {
    query: debouncedQuery.trim(),
    mode,
    caseSensitive,
    pathGlob,
  }

  const searchResult = useQuery(
    orpc.find.search.queryOptions({
      input: searchInput,
      enabled: searchInput.query.length > 0,
      placeholderData: keepPreviousData,
    }),
  )

  const searchResponse: SearchResponse | null = query.trim()
    ? (searchResult.data ?? null)
    : null

  const hasNoSources =
    configQuery.isSuccess &&
    configQuery.data.localRoots.length === 0 &&
    configQuery.data.githubRepos.length === 0

  return (
    <div className='grid gap-6'>
      <SearchChrome
        query={query}
        mode={mode}
        caseSensitive={caseSensitive}
        pathGlob={pathGlob}
        onQueryChange={setQuery}
        onModeChange={setMode}
        onCaseSensitiveChange={setCaseSensitive}
        onPathGlobChange={setPathGlob}
      />
      <SearchResults
        hasNoSources={hasNoSources}
        isPending={searchResult.isFetching}
        errorMessage={searchResult.error ? searchResult.error.message : null}
        searchResponse={searchResponse}
        onOpenSources={onOpenSources}
      />
    </div>
  )
}
