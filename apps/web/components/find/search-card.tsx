'use client'

import { Button } from '@repo/ui/components/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@repo/ui/components/empty'
import { Input } from '@repo/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select'
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { CopyIcon, FolderSearchIcon, LoaderCircleIcon } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { CopyButton } from '@/components/copy-button'
import type { FindConfig } from '@/features/find/config/schemas'
import type { SearchResponse } from '@/features/find/schemas'
import type { SearchOptions } from '@/features/find/search'
import { useDebounce } from '@/hooks/use-debounce'
import { orpc } from '@/lib/orpc/client'

const ALL_SOURCES_VALUE = '__all_sources__'

export function SearchCard() {
  const queryClient = useQueryClient()

  const configQuery = useQuery(orpc.find.getConfig.queryOptions())

  const [searchQuery, setSearchQuery] = useState('')
  const debouncedQuery = useDebounce(searchQuery, 220)

  const [filters, setFilters] = useState<
    Omit<SearchOptions, 'maxResultsPerSource' | 'query'>
  >({
    mode: 'literal',
    caseSensitive: false,
    wholeWord: false,
    extension: '',
    pathFilter: '',
    sourceFilter: '',
  })

  const searchInput = {
    query: debouncedQuery.trim(),
    ...filters,
  }

  const searchResult = useQuery(
    orpc.find.search.queryOptions({
      input: searchInput,
      enabled: searchInput.query.length > 0,
      placeholderData: keepPreviousData,
    }),
  )

  const searchResponse: SearchResponse | null = searchQuery.trim()
    ? (searchResult.data ?? null)
    : null
  const isSearchPending = searchResult.isFetching

  const latestRecentSearches = searchResult.data?.recentSearches

  useEffect(() => {
    if (!latestRecentSearches) {
      return
    }

    queryClient.setQueryData<FindConfig>(
      orpc.find.getConfig.queryKey(),
      (current) =>
        current
          ? { ...current, recentSearches: latestRecentSearches }
          : current,
    )
  }, [latestRecentSearches, queryClient])

  const hasNoSources =
    configQuery.isSuccess &&
    configQuery.data.localRoots.length === 0 &&
    configQuery.data.githubRepos.length === 0

  const updateFilter = <TKey extends keyof typeof filters>(
    key: TKey,
    value: (typeof filters)[TKey],
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search</CardTitle>
      </CardHeader>
      <CardContent className='grid gap-4 grid-cols-1'>
        {hasNoSources ? (
          <Empty className='border rounded-md'>
            <EmptyHeader>
              <EmptyTitle>Start by adding a source</EmptyTitle>
              <EmptyDescription>
                Add a local folder or select GitHub repositories, then search
                across all your code.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}

        <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder='Search code...'
            autoComplete='off'
          />

          <Select
            value={filters.mode}
            onValueChange={(value) =>
              updateFilter('mode', value as SearchOptions['mode'])
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='literal'>Literal search</SelectItem>
              <SelectItem value='regex'>Regex search</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.sourceFilter || ALL_SOURCES_VALUE}
            onValueChange={(value) =>
              updateFilter(
                'sourceFilter',
                value === ALL_SOURCES_VALUE ? '' : (value ?? ''),
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder='All sources' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_SOURCES_VALUE}>All sources</SelectItem>
              {searchResponse?.sourceOptions?.map((source) => (
                <SelectItem key={source.id} value={source.id}>
                  {source.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            value={filters.extension}
            onChange={(event) => updateFilter('extension', event.target.value)}
            placeholder='Extension filter (ts,tsx,py)'
          />

          <Input
            value={filters.pathFilter}
            onChange={(event) => updateFilter('pathFilter', event.target.value)}
            placeholder='Path contains...'
          />

          <div className='flex items-center gap-2 text-xs'>
            <label className='inline-flex items-center gap-1'>
              <input
                type='checkbox'
                checked={filters.caseSensitive}
                onChange={(event) =>
                  updateFilter('caseSensitive', event.target.checked)
                }
              />
              Case sensitive
            </label>
            <label className='inline-flex items-center gap-1'>
              <input
                type='checkbox'
                checked={filters.wholeWord}
                onChange={(event) =>
                  updateFilter('wholeWord', event.target.checked)
                }
              />
              Whole word
            </label>
          </div>
        </div>

        {configQuery.data?.recentSearches.length ? (
          <div className='flex flex-wrap gap-2 items-center'>
            <span className='text-xs text-muted-foreground'>Recent:</span>
            {configQuery.data.recentSearches.map((recent) => (
              <Button
                key={recent}
                type='button'
                variant='outline'
                size='sm'
                className='h-7 text-xs'
                onClick={() => setSearchQuery(recent)}
              >
                {recent}
              </Button>
            ))}
          </div>
        ) : null}

        {searchResponse?.missingSources.length ? (
          <div className='rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs'>
            Missing sources:{' '}
            {searchResponse.missingSources
              .map((source) => source.label)
              .join(', ')}
          </div>
        ) : null}

        {searchResult.error ? (
          <div className='rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs'>
            Search failed: {searchResult.error.message}
          </div>
        ) : null}

        {isSearchPending ? (
          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
            <LoaderCircleIcon className='size-3.5 animate-spin' />
            Searching...
          </div>
        ) : null}

        {!searchResponse && searchQuery ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Searching...</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : null}

        {searchResponse && searchResponse.totalMatches === 0 ? (
          <Empty className='border rounded-md'>
            <EmptyHeader>
              <EmptyTitle>No matches</EmptyTitle>
              <EmptyDescription>
                Try broadening the query, removing filters, or syncing GitHub
                repositories.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}

        {searchResponse?.groups.map((group) => (
          <div
            key={`${group.sourceId}:${group.projectName}`}
            className='grid gap-2'
          >
            <div className='flex items-center justify-between'>
              <h3 className='text-sm font-semibold'>
                {group.projectName}{' '}
                <span className='text-muted-foreground font-normal'>
                  ({group.matches.length})
                </span>
              </h3>
              <span className='text-xs text-muted-foreground'>
                {group.sourceLabel}
              </span>
            </div>
            <div className='grid gap-2'>
              {group.matches.slice(0, 10).map((match) => (
                <div
                  key={`${match.absolutePath}:${match.lineNumber}`}
                  className='rounded-md border bg-card'
                >
                  <div className='flex items-center justify-between border-b px-3 py-2'>
                    <Link
                      href={{
                        pathname: '/find/file',
                        query: {
                          path: match.absolutePath,
                          line: String(match.lineNumber),
                        },
                      }}
                      className='text-xs font-mono hover:underline underline-offset-4'
                    >
                      {match.relativePath}:{match.lineNumber}
                    </Link>

                    <div className='flex items-center gap-1'>
                      <CopyButton
                        copyText={match.lineText}
                        aria-label='Copy snippet'
                        size='icon-sm'
                      >
                        <CopyIcon />
                      </CopyButton>
                      <CopyButton
                        copyText={match.absolutePath}
                        aria-label='Copy path'
                        size='icon-sm'
                      >
                        <FolderSearchIcon />
                      </CopyButton>
                      <a
                        href={`cursor://file/${encodeURIComponent(
                          match.absolutePath,
                        )}:${match.lineNumber}`}
                        className='inline-flex items-center rounded-md border border-input bg-background px-2 py-1 text-xs font-medium shadow-xs hover:bg-accent'
                      >
                        Open in Cursor
                      </a>
                      <a
                        href={`vscode://file/${encodeURIComponent(
                          match.absolutePath,
                        )}:${match.lineNumber}`}
                        className='inline-flex items-center rounded-md border border-input bg-background px-2 py-1 text-xs font-medium shadow-xs hover:bg-accent'
                      >
                        Open in VS Code
                      </a>
                    </div>
                  </div>
                  <pre className='overflow-x-auto px-3 py-2 text-xs leading-relaxed'>
                    <code>
                      {highlightMatchedText(match.lineText, match.matchRanges)}
                    </code>
                  </pre>
                </div>
              ))}
              {group.matches.length > 10 ? (
                <p className='text-xs text-muted-foreground'>
                  Showing 10 of {group.matches.length} matches for this project.
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function highlightMatchedText(
  input: string,
  ranges: Array<{ start: number; end: number }>,
) {
  if (!ranges.length) {
    return input
  }

  const parts: React.ReactNode[] = []
  let cursor = 0

  for (const [index, range] of ranges.entries()) {
    if (range.start > cursor) {
      parts.push(
        <span key={`plain-${index}-${cursor}`}>
          {input.slice(cursor, range.start)}
        </span>,
      )
    }

    parts.push(
      <mark
        key={`match-${index}-${range.start}`}
        className='bg-amber-200 text-foreground px-0.5 rounded-sm dark:bg-amber-700/70'
      >
        {input.slice(range.start, range.end)}
      </mark>,
    )

    cursor = range.end
  }

  if (cursor < input.length) {
    parts.push(<span key='plain-tail'>{input.slice(cursor)}</span>)
  }

  return parts
}
