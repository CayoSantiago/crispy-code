'use client'

import { CursorIcon, VisualStudioCode } from '@dev.icons/react'
import { Button } from '@repo/ui/components/button'
import type { HighlightDecoration } from '@tanstack/highlight/core'
import { createHighlightedCodeBlockProps } from '@tanstack/highlight/react'
import { CheckIcon, FolderSearchIcon } from 'lucide-react'
import Link from 'next/link'
import { CodeBlock } from '@/components/code-block'
import { CopyButton } from '@/components/copy-button'
import { TruncatedFilePath } from '@/components/file'
import { FileIcon } from '@/components/file-icon'
import { Tooltip } from '@/components/tooltip'
import { truncateFilesByMatchBudget } from '@/features/find/cluster-search-lines'
import type { SearchFile, SearchGroup } from '@/features/find/schemas'
import { highlighter } from '@/lib/highlighter'
import { languageForFilename } from '@/lib/highlighter/helpers'

const MATCHES_PER_PROJECT = 10

export function SearchHitList({ groups }: { groups: SearchGroup[] }) {
  if (!groups.length) return null

  return (
    <>
      {groups.map((group) => {
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

                const lineNum = Number(
                  decorations.find((d) => d.data?.lineNumber)?.data?.lineNumber,
                )

                const lineNumberToLink =
                  Number.isNaN(lineNum) || !Number.isFinite(lineNum)
                    ? undefined
                    : lineNum

                return (
                  <CodeBlock key={file.absolutePath} variant='full' {...props}>
                    <div className='flex items-center max-w-full gap-1.5 p-2 pr-3 bg-muted h-10'>
                      <FileIcon filePath={file.absolutePath} />

                      <figcaption className='min-w-0'>
                        <Link
                          href={{
                            pathname: '/find/file',
                            query: {
                              path: file.absolutePath,
                              line: lineNumberToLink,
                            },
                          }}
                        >
                          <TruncatedFilePath filePath={file.absolutePath} />
                        </Link>
                      </figcaption>

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
                    </div>
                  </CodeBlock>
                )
              })}

              {visibleMatchCount < group.matchCount ? (
                <p className='py-2 text-xs text-muted-foreground'>
                  Showing {visibleMatchCount} of {group.matchCount} matches for
                  this project.
                </p>
              ) : null}
            </div>
          </div>
        )
      })}
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
              data: { lineNumber: line.lineNumber },
            }
          }) ?? []),
    )

  return { code, decorations }
}
