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
import { truncateFilesByMatchBudget } from '@/features/find/cluster-search-lines'
import type { SearchFile, SearchResponse } from '@/features/find/schemas'
import { useDebounce } from '@/hooks/use-debounce'
import { orpc } from '@/lib/orpc/client'
import { ToggleSourcesSheetButton } from './sources-sheet'

const MATCHES_PER_PROJECT = 10

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

      {searchResponse?.groups.map((group) => {
        const visibleFiles = truncateFilesByMatchBudget(
          group.files,
          MATCHES_PER_PROJECT,
        )
        const visibleMatchCount = visibleFiles.reduce(
          (sum, file) => sum + file.matchCount,
          0,
        )

        return (
          <div
            key={`${group.sourceId}:${group.projectName}`}
            className='grid grid-cols-1'
          >
            <div className='flex items-center justify-between py-2'>
              <h3 className='text-sm font-semibold'>
                {group.projectName}{' '}
                <span className='text-muted-foreground font-normal'>
                  ({group.matchCount})
                </span>
              </h3>
              <span className='text-xs text-muted-foreground'>
                {group.sourceLabel}
              </span>
            </div>

            <div>
              {visibleFiles.map((file) => (
                <div
                  key={file.absolutePath}
                  className='border-t py-2 group/file-result'
                >
                  <div className='flex items-center justify-between gap-2'>
                    <Link
                      href={{
                        pathname: '/find/file',
                        query: {
                          path: file.absolutePath,
                          line: String(firstMatchLineNumber(file)),
                        },
                      }}
                      className='text-xs font-mono hover:underline underline-offset-4'
                    >
                      {file.relativePath}
                    </Link>

                    <div className='flex shrink-0 items-center gap-0.5 opacity-0 group-hover/file-result:opacity-100 transition-[opacity] duration-100'>
                      <Tooltip
                        tooltip='Copy file path'
                        render={
                          <CopyButton
                            copyText={file.absolutePath}
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
                                  file.absolutePath,
                                )}:${firstMatchLineNumber(file)}`}
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
                                  file.absolutePath,
                                )}:${firstMatchLineNumber(file)}`}
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

                  {file.clusters.map((cluster, clusterIndex) => (
                    <div
                      key={`${file.absolutePath}:${cluster.lines[0]?.lineNumber ?? clusterIndex}`}
                    >
                      {clusterIndex > 0 ? (
                        <div className='my-2 border-t border-dashed border-border/70' />
                      ) : null}

                      <div className='mt-1 group/cluster relative'>
                        <div className='absolute right-0 top-0 opacity-0 group-hover/cluster:opacity-100 transition-[opacity] duration-100'>
                          <Tooltip
                            tooltip='Copy snippet'
                            render={
                              <CopyButton
                                copyText={clusterCopyText(cluster.lines)}
                                aria-label='Copy snippet'
                              />
                            }
                          >
                            <CheckIcon className='absolute inset-0 m-auto opacity-0 group-data-[copied="true"]/copy-button:opacity-100' />
                            <CopyIcon className='absolute inset-0 m-auto group-data-[copied="true"]/copy-button:opacity-0' />
                            <span className='sr-only'>Copy code</span>
                          </Tooltip>
                        </div>

                        <div className='grid grid-cols-[auto_1fr] gap-x-3 text-xs font-mono leading-relaxed'>
                          {cluster.lines.map((line) => {
                            const href = {
                              pathname: '/find/file',
                              query: {
                                path: file.absolutePath,
                                line: String(line.lineNumber),
                              },
                            } as const

                            return (
                              <Link
                                key={`${file.absolutePath}:${line.lineNumber}:${line.kind}`}
                                href={href}
                                className={
                                  line.kind === 'match'
                                    ? 'col-span-2 grid grid-cols-subgrid bg-foreground/5 hover:bg-foreground/8'
                                    : 'col-span-2 grid grid-cols-subgrid text-muted-foreground hover:bg-foreground/5'
                                }
                              >
                                <span className='select-none text-right text-muted-foreground tabular-nums py-0.5 pl-1'>
                                  {line.lineNumber}
                                </span>
                                <pre className='overflow-x-auto overscroll-none no-scrollbar py-0.5 pr-8'>
                                  <code>
                                    {line.kind === 'match'
                                      ? highlightMatchedText(
                                          line.lineText,
                                          line.matchRanges ?? [],
                                        )
                                      : line.lineText}
                                  </code>
                                </pre>
                              </Link>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              {visibleMatchCount < group.matchCount ? (
                <p className='border-t py-2 text-xs text-muted-foreground'>
                  Showing {visibleMatchCount} of {group.matchCount} matches for
                  this project.
                </p>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function firstMatchLineNumber(file: SearchFile): number {
  for (const cluster of file.clusters) {
    for (const line of cluster.lines) {
      if (line.kind === 'match') {
        return line.lineNumber
      }
    }
  }

  return file.clusters[0]?.lines[0]?.lineNumber ?? 1
}

function clusterCopyText(lines: Array<{ lineText: string }>): string {
  return lines.map((line) => line.lineText).join('\n')
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
