import { createHighlightedCodeBlockProps } from '@tanstack/highlight/react'
import { CodeBlock, CodeBlockHeader } from '@/components/code-block'
import { languageForFilename } from '@/features/diff/language-for-filename'
import { parsePatch } from '@/features/diff/parse-patch'
import type { GitHubCommitFile } from '@/features/github/types'
import { highlighter } from '@/lib/highlight'
import { CommitFileActions } from './commit-file-actions'

export function FileDiff({ file }: { file: GitHubCommitFile }) {
  const heading = (
    <div className='flex gap-3 items-center text-xs'>
      <span className='text-muted-foreground'>{file.status}</span>
      <span className='text-emerald-600 dark:text-emerald-400'>
        +{file.additions}
      </span>
      <span className='text-red-600 dark:text-red-400'>-{file.deletions}</span>
      {file.previous_filename ? (
        <span className='text-muted-foreground font-mono'>
          renamed from {file.previous_filename}
        </span>
      ) : null}
    </div>
  )

  if (!file.patch) {
    return (
      <div
        id={encodeURIComponent(file.filename)}
        className='grid gap-2 w-full scroll-m-4'
      >
        {heading}
        <div className='border rounded-md bg-card p-4'>
          <p className='font-mono text-xs'>{file.filename}</p>
          <p className='text-muted-foreground text-sm mt-1'>
            No diff available. GitHub omits patches for binary files and for
            changes it considers too large.
          </p>
        </div>
      </div>
    )
  }

  const { code, decorations } = parsePatch(file.patch)

  const props = createHighlightedCodeBlockProps({
    code,
    decorations,
    highlighter,
    lang: languageForFilename(file.filename),
    title: file.filename,
  })

  return (
    <div
      id={encodeURIComponent(file.filename)}
      className='grid gap-2 w-full grid-cols-1 scroll-m-4'
    >
      {heading}
      <CodeBlock variant='full' {...props}>
        <CodeBlockHeader filePath={file.filename}>
          <CommitFileActions file={file} className='ml-auto' />
        </CodeBlockHeader>
      </CodeBlock>
    </div>
  )
}
