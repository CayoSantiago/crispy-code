import path from 'node:path'
import { createHighlightedCodeBlockProps } from '@tanstack/highlight/react'
import { notFound } from 'next/navigation'
import { z } from 'zod/v4'
import { CodeBlock, CodeBlockHeader } from '@/components/code-block'
import { FileImagePreview } from '@/components/file-image-preview'
import { HexDump } from '@/components/hex-dump'
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
    <section className='grid w-full grid-cols-1 gap-6'>
      <div className='grid gap-1'>
        <h1 className='text-lg font-semibold'>File view</h1>
        <p className='font-mono text-xs text-muted-foreground'>
          {filePath}
          {inspection.kind === 'text' && line > 0 ? `:${line}` : null}
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
  line,
  inspection,
}: {
  filePath: string
  prefix: FilePrefix
  line: number
  inspection: FileInspection
}) {
  if (inspection.kind === 'text') {
    const props = createHighlightedCodeBlockProps({
      code: inspection.text,
      highlighter,
      lang: languageForFilename(filePath),
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

  if (inspection.kind === 'image' && !prefix.truncated) {
    return (
      <FileImagePreview
        filePath={filePath}
        formatLabel={formatLabel(inspection.format)}
        src={`data:${inspection.mime};base64,${prefix.bytes.toString('base64')}`}
      />
    )
  }

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
  if (
    !config.localRoots.some(
      (root) => isInsideRoot(filePath, root.path) || filePath === root.path,
    )
  ) {
    notFound()
  }
}
