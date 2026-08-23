function asciiChar(byte: number): string {
  return byte >= 0x20 && byte <= 0x7e ? String.fromCharCode(byte) : '.'
}

function hexGroup(row: Uint8Array, start: number): string {
  const parts: string[] = []

  for (let index = start; index < start + 8; index++) {
    const byte = row[index]
    parts.push(byte === undefined ? '  ' : byte.toString(16).padStart(2, '0'))
  }

  return parts.join(' ')
}

function formatRow(offset: number, row: Uint8Array): string {
  const hexField = `${hexGroup(row, 0)}  ${hexGroup(row, 8)}`
  let ascii = ''

  for (const byte of row) {
    ascii += asciiChar(byte)
  }

  return `${offset.toString(16).padStart(8, '0')}  ${hexField}  |${ascii}|`
}

export function formatHexDump(
  bytes: Uint8Array,
  options?: { maxBytes?: number },
): string {
  const slice =
    options?.maxBytes === undefined
      ? bytes
      : bytes.subarray(0, options.maxBytes)

  if (slice.length === 0) {
    return ''
  }

  const lines: string[] = []

  for (let offset = 0; offset < slice.length; offset += 16) {
    lines.push(formatRow(offset, slice.subarray(offset, offset + 16)))
  }

  return lines.join('\n')
}
