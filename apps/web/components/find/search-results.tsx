'use client'

import { CursorIcon, VisualStudioCode } from '@dev.icons/react'
import { Button } from '@repo/ui/components/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@repo/ui/components/empty'
import { cn } from '@repo/ui/lib/utils'
import type { HighlightDecoration } from '@tanstack/highlight/core'
import { createHighlightedCodeBlockProps } from '@tanstack/highlight/react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { CheckIcon, FolderSearchIcon, LoaderCircleIcon } from 'lucide-react'
import { parseAsBoolean, useQueryStates } from 'nuqs'
import { CopyButton } from '@/components/copy-button'
import { Tooltip } from '@/components/tooltip'
import { languageForFilename } from '@/features/diff/language-for-filename'
import { truncateFilesByMatchBudget } from '@/features/find/cluster-search-lines'
import type { SearchFile } from '@/features/find/schemas'
import { useDebounce } from '@/hooks/use-debounce'
import { highlighter } from '@/lib/highlight'
import { stringParser } from '@/lib/nuqs/parsers'
import { orpc } from '@/lib/orpc/client'
import { CodeBlock, CodeBlockHeader } from '../code-block'
import { ToggleSourcesSheetButton } from './sources-sheet'

const MATCHES_PER_PROJECT = 10

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
        data?.groups.map((group) => {
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

              <div className='grid grid-cols-1 gap-3'>
                {visibleFiles.map((file) => {
                  const { code, decorations } = formatSearchFileData(file)

                  const props = createHighlightedCodeBlockProps({
                    highlighter,
                    code,
                    title: file.absolutePath,
                    lang: languageForFilename(file.absolutePath),
                    decorations,
                  })

                  return (
                    <CodeBlock
                      key={file.absolutePath}
                      variant='full'
                      {...props}
                    >
                      <CodeBlockHeader filePath={file.absolutePath}>
                        <div className='flex shrink-0 items-center gap-0.5 ml-auto'>
                          <CopyButton
                            copyText={file.absolutePath}
                            aria-label='Copy file path'
                            className='text-muted-foreground'
                            render={<Tooltip tooltip='Copy file path' />}
                          >
                            <CheckIcon className='absolute inset-0 m-auto opacity-0 scale-0 group-data-[copied="true"]/copy-button:opacity-100 group-data-[copied="true"]/copy-button:scale-100 transition-[opacity,scale]' />
                            <FolderSearchIcon className='absolute inset-0 m-auto group-data-[copied="true"]/copy-button:opacity-0 group-data-[copied="true"]/copy-button:scale-0 transition-[opacity,scale]' />
                          </CopyButton>

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
                      </CodeBlockHeader>
                    </CodeBlock>
                  )
                })}

                {visibleMatchCount < group.matchCount ? (
                  <p className='py-2 text-xs text-muted-foreground'>
                    Showing {visibleMatchCount} of {group.matchCount} matches
                    for this project.
                  </p>
                ) : null}
              </div>
            </div>
          )
        })
      )}
    </>
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

function formatSearchFileData(file: SearchFile) {
  const lines = file.clusters.reduce(
    (acc, cluster) =>
      !acc.length
        ? cluster.lines
        : [
            // biome-ignore lint/performance/noAccumulatingSpread: fine here
            ...acc,
            ...(cluster.lines.length
              ? [
                  {
                    lineNumber: -1,
                    lineText: '< ------- >',
                    kind: 'separator' as const,
                    matchRanges: undefined,
                  },
                ]
              : []),
            ...cluster.lines,
          ],
    [] as (Omit<SearchFile['clusters'][number]['lines'][number], 'kind'> & {
      kind: 'context' | 'match' | 'separator'
    })[],
  )

  const code = lines.map((line) => line.lineText).join('\n')

  const decorations = lines
    .map((line, idx) => ({
      ...line,
      relativeLineNumber: idx + 1,
    }))
    .filter((line) => line.kind !== 'context')
    .flatMap((line) =>
      line.kind === 'separator'
        ? [
            {
              lines: line.relativeLineNumber,
              className: 'text-muted-foreground',
            },
          ]
        : (line.matchRanges?.map((range): HighlightDecoration => {
            const startIdx = code.indexOf(line.lineText)
            return {
              range: [startIdx + range.start, startIdx + range.end],
              className: 'bg-yellow-400/30',
            }
          }) ?? []),
    )

  return { code, decorations }
}
