import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createHighlightedCodeBlockProps } from '@tanstack/highlight/react'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { CodeBlock, CodeBlockHeader } from '@/components/code-block'
import { languageForFilename } from '@/features/diff/language-for-filename'
import { FIND_MIRROR_ROOT } from '@/features/find/config/data'
import { readFindConfig } from '@/features/find/config/service'
import { highlighter } from '@/lib/highlight'

const fileParamsSchema = z.object({
  path: z.string().min(1),
  line: z.coerce.number().int().positive().catch(0),
})

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
    path.join(FIND_MIRROR_ROOT, item.owner, item.repo),
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
}: PageProps<'/find/file'>) {
  const parsed = fileParamsSchema.safeParse(await searchParams)

  if (!parsed.success) {
    notFound()
  }

  const { path: inputPath, line } = parsed.data
  const filePath = normalizeFilePath(inputPath)
  await assertKnownSource(filePath)

  let code: string

  try {
    code = await readFile(filePath, 'utf8')
  } catch {
    notFound()
  }

  const language = languageForFilename(filePath)

  const props = createHighlightedCodeBlockProps({
    code,
    highlighter,
    lang: language,
    title: filePath,
    lineNumbers: true,
    decorations: [{ lines: line, className: 'th-line--highlighted' }],
  })

  return (
    <section className='grid grid-cols-1 gap-6 w-full'>
      <div className='grid gap-1'>
        <h1 className='text-lg font-semibold'>File view</h1>
        <p className='text-xs text-muted-foreground font-mono'>
          {filePath}
          {line > 0 ? `:${line}` : ''}
        </p>
      </div>

      <CodeBlock variant='full' {...props}>
        <CodeBlockHeader filePath={filePath} />
      </CodeBlock>
    </section>
  )
}
