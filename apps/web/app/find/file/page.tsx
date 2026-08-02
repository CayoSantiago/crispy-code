import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createHighlightedCodeBlockProps } from '@tanstack/highlight/react'
import { notFound } from 'next/navigation'
import { CodeBlock } from '@/components/code-block'
import { languageForFilename } from '@/lib/diff/language-for-filename'
import { readFindConfig } from '@/lib/find/config'
import { highlighter } from '@/lib/highlight'

function normalizeFilePath(raw: string): string {
  return path.resolve(raw)
}

function isInsideRoot(candidate: string, root: string): boolean {
  const relative = path.relative(root, candidate)
  return (
    relative.length > 0 &&
    !relative.startsWith('..') &&
    !path.isAbsolute(relative)
  )
}

async function assertKnownSource(filePath: string): Promise<void> {
  const config = await readFindConfig()
  const localRoots = config.localRoots.map((item) => item.path)
  const repoRoots = config.githubRepos.map((item) =>
    path.join(
      process.env.HOME ?? '',
      '.crispy-code',
      'repos',
      item.owner,
      item.repo,
    ),
  )

  const knownRoots = [...localRoots, ...repoRoots]

  if (
    !knownRoots.some(
      (root) => isInsideRoot(filePath, root) || filePath === root,
    )
  ) {
    notFound()
  }
}

export default async function FindFilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const inputPath = params.path
  const line = Number(params.line ?? 0)

  if (typeof inputPath !== 'string' || !inputPath.length) {
    notFound()
  }

  const filePath = normalizeFilePath(inputPath)
  await assertKnownSource(filePath)

  let code: string

  try {
    code = await readFile(filePath, 'utf8')
  } catch {
    notFound()
  }

  const language = languageForFilename(filePath)
  const lines = code.split('\n')
  const focusStart = Number.isFinite(line) && line > 3 ? line - 3 : 1
  const focusEnd = Number.isFinite(line) ? Math.min(line + 3, lines.length) : 0
  const focusSlice =
    line > 0
      ? lines
          .slice(focusStart - 1, focusEnd)
          .map((item, index) => `${focusStart + index}: ${item}`)
          .join('\n')
      : null
  const props = createHighlightedCodeBlockProps({
    code,
    highlighter,
    lang: language,
    title: filePath,
  })

  return (
    <section className='grid gap-3 w-full'>
      <div className='grid gap-1'>
        <h1 className='text-lg font-semibold'>File view</h1>
        <p className='text-xs text-muted-foreground font-mono'>
          {filePath}
          {Number.isFinite(line) && line > 0 ? `:${line}` : ''}
        </p>
      </div>
      {focusSlice ? (
        <div className='rounded-md border bg-card p-3'>
          <p className='text-xs font-medium mb-2'>Jumped to line {line}</p>
          <pre className='text-xs overflow-x-auto'>
            <code>{focusSlice}</code>
          </pre>
        </div>
      ) : null}
      <CodeBlock
        {...props}
        className='[--code-block-max-height:--spacing(full)] [&_div]:data-[slot="code"]:overflow-y-visible'
      />
    </section>
  )
}
