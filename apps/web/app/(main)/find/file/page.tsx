import path from 'node:path'
import { createHighlightedCodeBlockProps } from '@tanstack/highlight/react'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { CodeBlock, CodeBlockHeader } from '@/components/code-block'
import { FileImagePreview } from '@/components/file-image-preview'
import { HexDump } from '@/components/hex-dump'
import { FIND_MIRROR_ROOT } from '@/features/find/config/data'
import { readFindConfig } from '@/features/find/config/service'
import { formatHexDump } from '@/lib/hex-dump'
import { highlighter } from '@/lib/highlighter'
import { languageForFilename } from '@/lib/highlighter/helpers'
import {
  type FileInspection,
  formatLabel,
  inspectFileBytes,
} from '@/lib/inspect-file'
import {
  FILE_VIEW_MAX_HEX_BYTES,
  FILE_VIEW_MAX_READ_BYTES,
  type FilePrefix,
  formatKibLabel,
  readFilePrefix,
} from '@/lib/read-file-prefix'

const fileParamsSchema = z.object({
  path: z.string().min(1),
  line: z.coerce.number().int().positive().catch(0),
})

export default async function FindFilePage({
  searchParams,
}: PageProps<'/find/file'>) {
  const parsed = fileParamsSchema.safeParse(await searchParams)
  if (!parsed.success) notFound()

  const { path: inputPath, line } = parsed.data
  const filePath = path.resolve(inputPath)
  await assertKnownSource(filePath)

  let prefix: FilePrefix

  try {
    prefix = await readFilePrefix(filePath, FILE_VIEW_MAX_READ_BYTES)
  } catch {
    notFound()
  }

  const inspection = inspectFileBytes(prefix.bytes)

  return (
    <section className='grid grid-cols-1 gap-6 w-full'>
      <div className='grid gap-1'>
        <h1 className='text-lg font-semibold'>File view</h1>
        <p className='text-xs text-muted-foreground font-mono'>
          {filePath}
          {inspection.kind === 'text' ? (line > 0 ? `:${line}` : '') : null}
        </p>
      </div>

      <TruncationNotice prefix={prefix} kind={inspection.kind} />

      <FilePreview
        filePath={filePath}
        line={line}
        prefix={prefix}
        inspection={inspection}
      />
    </section>
  )
}

function FilePreview({
  filePath,
  prefix,
  line = 0,
  inspection,
}: {
  filePath: string
  prefix: FilePrefix
  line?: number
  inspection: FileInspection
}) {
  // Text
  if (inspection.kind === 'text') {
    const language = languageForFilename(filePath)

    const props = createHighlightedCodeBlockProps({
      code: inspection.text,
      highlighter,
      lang: language,
      title: filePath,
      lineNumbers: true,
      decorations: [{ lines: line, className: 'th-line--highlighted' }],
    })

    return (
      <CodeBlock variant='full' {...props}>
        <CodeBlockHeader filePath={filePath} />
      </CodeBlock>
    )
  }

  // Image (Viewable)
  if (inspection.kind === 'image' && !prefix.truncated) {
    return (
      <FileImagePreview
        filePath={filePath}
        formatLabel={formatLabel(inspection.format)}
        src={`data:${inspection.mime};base64,${prefix.bytes.toString('base64')}`}
      />
    )
  }

  // Binary (Hex) + Image (Non-Viewable)
  return (
    <HexDump
      filePath={filePath}
      formatLabel={formatLabel(inspection.format)}
      dump={formatHexDump(prefix.bytes, {
        maxBytes: FILE_VIEW_MAX_HEX_BYTES,
      })}
    />
  )
}

function TruncationNotice({
  prefix,
  kind,
}: {
  prefix: FilePrefix
  kind: FileInspection['kind']
}) {
  if (kind === 'image' && !prefix.truncated) return null

  const hexCapped =
    kind === 'binary' && prefix.bytes.byteLength > FILE_VIEW_MAX_HEX_BYTES

  if (!prefix.truncated && !hexCapped) return null

  return (
    <div className='grid gap-1 text-xs text-muted-foreground'>
      {prefix.truncated ? (
        <p>
          Showing first {formatKibLabel(FILE_VIEW_MAX_READ_BYTES)} of{' '}
          {prefix.byteLength} bytes.
        </p>
      ) : null}
      {hexCapped ? (
        <p>Showing first {formatKibLabel(FILE_VIEW_MAX_HEX_BYTES)} of hex</p>
      ) : null}
    </div>
  )
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
