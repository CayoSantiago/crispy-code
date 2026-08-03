'use client'

import { CursorIcon, VisualStudioCode } from '@dev.icons/react'
import { Button } from '@repo/ui/components/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@repo/ui/components/empty'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  CheckIcon,
  CopyIcon,
  FolderSearchIcon,
  LoaderCircleIcon,
} from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'
import { CopyButton } from '@/components/copy-button'
import { Tooltip } from '@/components/tooltip'
import type { SearchResponse } from '@/features/find/schemas'
import { useDebounce } from '@/hooks/use-debounce'
import { orpc } from '@/lib/orpc/client'
import { ToggleSourcesSheetButton } from './sources-sheet'

export function SearchResults() {
  const configQuery = useQuery(orpc.find.getConfig.queryOptions())

  const search = useSearchParams()

  const query = decodeURIComponent(search.get('q') ?? '')
  const debouncedQuery = useDebounce(query, 220)

  const debouncedPathGlob = useDebounce(
    decodeURIComponent(search.get('path') ?? ''),
    220,
  )

  const searchInput = {
    query: debouncedQuery,
    mode:
      search.get('regex') === 'true'
        ? ('regex' as const)
        : ('literal' as const),
    caseSensitive: search.get('case') === 'true',
    pathGlob: debouncedPathGlob,
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

  if (hasNoSources) {
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

  return (
    <div className='grid gap-4 grid-cols-1'>
      {searchResponse?.missingSources.length ? (
        <div className='border-l-2 border-amber-500/50 pl-3 text-xs text-muted-foreground'>
          Missing sources:{' '}
          {searchResponse.missingSources
            .map((source) => source.label)
            .join(', ')}
        </div>
      ) : null}

      {searchResult.error?.message ? (
        <div className='border-l-2 border-destructive/50 pl-3 text-xs text-destructive'>
          Search failed: {searchResult.error?.message}
        </div>
      ) : null}

      {searchResult.isFetching ? (
        <div className='flex items-center gap-2 text-xs text-muted-foreground'>
          <LoaderCircleIcon className='size-3.5 animate-spin' />
          Searching...
        </div>
      ) : null}

      {searchResponse && searchResponse.totalMatches === 0 ? (
        <Empty>
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
          className='grid grid-cols-1'
        >
          <div className='flex items-center justify-between py-2'>
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
          <div>
            {group.matches.slice(0, 10).map((match) => (
              <div
                key={`${match.absolutePath}:${match.lineNumber}`}
                className='border-t py-2 group/code-snippet'
              >
                <div className='flex items-center justify-between gap-2'>
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

                  <div className='flex shrink-0 items-center gap-0.5 opacity-0 group-hover/code-snippet:opacity-100 transition-[opacity] duration-100'>
                    <Tooltip
                      tooltip='Copy snippet'
                      render={
                        <CopyButton
                          copyText={match.lineText}
                          aria-label='Copy snippet'
                        />
                      }
                    >
                      <CheckIcon className='absolute inset-0 m-auto opacity-0 group-data-[copied="true"]/copy-button:opacity-100' />
                      <CopyIcon className='absolute inset-0 m-auto group-data-[copied="true"]/copy-button:opacity-0' />
                      <span className='sr-only'>Copy code</span>
                    </Tooltip>

                    <Tooltip
                      tooltip='Copy file path'
                      render={
                        <CopyButton
                          copyText={match.absolutePath}
                          aria-label='Copy path'
                        />
                      }
                    >
                      <CheckIcon className='absolute inset-0 m-auto opacity-0 group-data-[copied="true"]/copy-button:opacity-100' />
                      <FolderSearchIcon className='absolute inset-0 m-auto group-data-[copied="true"]/copy-button:opacity-0' />
                      <span className='sr-only'>Copy file path</span>
                    </Tooltip>

                    <Tooltip
                      tooltip='Open in Cursor'
                      render={
                        <Button
                          nativeButton={false}
                          variant='ghost'
                          size='icon-sm'
                          render={
                            <a
                              href={`cursor://file/${encodeURIComponent(
                                match.absolutePath,
                              )}:${match.lineNumber}`}
                              aria-label='Open in Cursor'
                            />
                          }
                        />
                      }
                    >
                      <CursorIcon />
                    </Tooltip>

                    <Tooltip
                      tooltip='Open in Visual Studio Code'
                      render={
                        <Button
                          nativeButton={false}
                          variant='ghost'
                          size='icon-sm'
                          render={
                            <a
                              href={`vscode://file/${encodeURIComponent(
                                match.absolutePath,
                              )}:${match.lineNumber}`}
                              aria-label='Open in Visual Studio Code'
                            />
                          }
                        />
                      }
                    >
                      <VisualStudioCode />
                    </Tooltip>
                  </div>
                </div>
                <pre className='mt-1 overflow-x-auto overscroll-none no-scrollbar text-xs leading-relaxed'>
                  <code>
                    {highlightMatchedText(match.lineText, match.matchRanges)}
                  </code>
                </pre>
              </div>
            ))}
            {group.matches.length > 10 ? (
              <p className='border-t py-2 text-xs text-muted-foreground'>
                Showing 10 of {group.matches.length} matches for this project.
              </p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}

function highlightMatchedText(
  input: string,
  ranges: Array<{ start: number; end: number }>,
) {
  if (!ranges.length) {
    return input
  }

  const parts: ReactNode[] = []
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
