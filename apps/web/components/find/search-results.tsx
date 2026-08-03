'use client'

import { Button } from '@repo/ui/components/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@repo/ui/components/empty'
import { CopyIcon, FolderSearchIcon, LoaderCircleIcon } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { CopyButton } from '@/components/copy-button'
import type { SearchResponse } from '@/features/find/schemas'

export type SearchResultsProps = {
  hasNoSources: boolean
  isPending: boolean
  errorMessage: string | null
  searchResponse: SearchResponse | null
  onOpenSources: () => void
}

export function SearchResults({
  hasNoSources,
  isPending,
  errorMessage,
  searchResponse,
  onOpenSources,
}: SearchResultsProps) {
  return (
    <div className='grid gap-4'>
      {hasNoSources ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Start by adding a source</EmptyTitle>
            <EmptyDescription>
              Add a local folder or select GitHub repositories, then search
              across your code.
            </EmptyDescription>
          </EmptyHeader>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={onOpenSources}
          >
            Open Sources
          </Button>
        </Empty>
      ) : null}

      {searchResponse?.missingSources.length ? (
        <div className='border-l-2 border-amber-500/50 pl-3 text-xs text-muted-foreground'>
          Missing sources:{' '}
          {searchResponse.missingSources
            .map((source) => source.label)
            .join(', ')}
        </div>
      ) : null}

      {errorMessage ? (
        <div className='border-l-2 border-destructive/50 pl-3 text-xs text-destructive'>
          Search failed: {errorMessage}
        </div>
      ) : null}

      {isPending ? (
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
        <div key={`${group.sourceId}:${group.projectName}`} className='grid'>
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
                className='border-t py-2'
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

                  <div className='flex shrink-0 items-center gap-0.5'>
                    <CopyButton
                      copyText={match.lineText}
                      aria-label='Copy snippet'
                    >
                      <CopyIcon />
                    </CopyButton>
                    <CopyButton
                      copyText={match.absolutePath}
                      aria-label='Copy path'
                    >
                      <FolderSearchIcon />
                    </CopyButton>
                    <Button
                      nativeButton={false}
                      variant='ghost'
                      size='sm'
                      className='h-7 px-2 text-xs'
                      render={
                        <a
                          href={`cursor://file/${encodeURIComponent(
                            match.absolutePath,
                          )}:${match.lineNumber}`}
                        />
                      }
                    >
                      Cursor
                    </Button>
                    <Button
                      nativeButton={false}
                      variant='ghost'
                      size='sm'
                      className='h-7 px-2 text-xs'
                      render={
                        <a
                          href={`vscode://file/${encodeURIComponent(
                            match.absolutePath,
                          )}:${match.lineNumber}`}
                        />
                      }
                    >
                      VS Code
                    </Button>
                  </div>
                </div>
                <pre className='mt-1 overflow-x-auto text-xs leading-relaxed'>
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
