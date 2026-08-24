'use client'

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@repo/ui/components/empty'
import { cn } from '@repo/ui/lib/utils'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { LoaderCircleIcon } from 'lucide-react'
import { parseAsBoolean, useQueryStates } from 'nuqs'
import { SearchHitList } from '@/features/find/components/search-hit-list'
import { ToggleSourcesSheetButton } from '@/features/find/components/sources-sheet'
import { useDebounce } from '@/hooks/use-debounce'
import { stringParser } from '@/lib/nuqs/parsers'
import { orpc } from '@/lib/orpc/client'

export function SearchResults() {
  const configQuery = useQuery(orpc.find.getConfig.queryOptions())

  const [filters] = useQueryStates({
    q: stringParser.withDefault('').withOptions({ clearOnDefault: true }),
    path: stringParser.withDefault('').withOptions({ clearOnDefault: true }),
    case: parseAsBoolean.withDefault(false),
    regex: parseAsBoolean.withDefault(false),
  })

  const debouncedQuery = useDebounce(filters.q, 220)
  const debouncedPathGlob = useDebounce(filters.path, 220)

  const searchInput = {
    query: debouncedQuery,
    mode: filters.regex ? 'regex' : 'literal',
    caseSensitive: filters.case,
    pathGlob: debouncedPathGlob,
  } as const

  const { data, isFetching, error } = useQuery(
    orpc.find.search.queryOptions({
      input: searchInput,
      enabled: searchInput.query.length > 0,
      placeholderData: keepPreviousData,
    }),
  )

  if (
    configQuery.isSuccess &&
    !configQuery.data.localRoots.length &&
    !configQuery.data.githubRepos.length
  ) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Start by adding a source</EmptyTitle>
          <EmptyDescription>
            Add a local folder or select GitHub repositories, then search across
            your code.
          </EmptyDescription>
        </EmptyHeader>
        <ToggleSourcesSheetButton type='button' variant='outline' size='sm'>
          Open Sources
        </ToggleSourcesSheetButton>
      </Empty>
    )
  }

  if (!filters.q.trim().length) return null

  return (
    <>
      {data?.missingSources.length ? (
        <div className='border-l-2 border-amber-500/50 pl-3 text-xs text-muted-foreground'>
          Missing sources:{' '}
          {data.missingSources.map((source) => source.label).join(', ')}
        </div>
      ) : null}

      {error?.message ? (
        <div className='border-l-2 border-destructive/50 pl-3 text-xs text-destructive'>
          Search failed: {error.message}
        </div>
      ) : null}

      <div
        aria-hidden={!isFetching}
        className={cn(
          'flex items-center gap-2 -mb-4 text-xs text-muted-foreground',
          !isFetching && 'opacity-0',
        )}
      >
        <LoaderCircleIcon className='size-3.5 animate-spin' />
        Searching...
      </div>

      {!isFetching && !data?.totalMatches ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No matches</EmptyTitle>
            <EmptyDescription>
              Try broadening the query, removing filters, or syncing GitHub
              repositories.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <SearchHitList groups={data?.groups ?? []} />
      )}
    </>
  )
}
