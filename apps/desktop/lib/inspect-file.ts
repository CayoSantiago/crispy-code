export type DetectedFormat =
  | 'png'
  | 'jpeg'
  | 'gif'
  | 'webp'
  | 'pdf'
  | 'wasm'
  | 'gzip'
  | 'zip'

export const IMAGE_MIME_TYPES = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
} as const satisfies Partial<Record<DetectedFormat, string>>

export type ImageFormat = keyof typeof IMAGE_MIME_TYPES
export type ImageMime = (typeof IMAGE_MIME_TYPES)[ImageFormat]
export type FileEncoding = 'utf-8' | 'utf-16le' | 'utf-16be'

export type FileInspection =
  | {
      kind: 'text'
      encoding: FileEncoding
      text: string
      bom: boolean
    }
  | {
      kind: 'image'
      format: ImageFormat
      mime: ImageMime
    }
  | {
      kind: 'binary'
      format: DetectedFormat | null
    }

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const
const JPEG = [0xff, 0xd8, 0xff] as const
const GIF = [0x47, 0x49, 0x46, 0x38] as const
const PDF = [0x25, 0x50, 0x44, 0x46] as const
const WASM = [0x00, 0x61, 0x73, 0x6d] as const
const GZIP = [0x1f, 0x8b] as const
const ZIP_LOCAL = [0x50, 0x4b, 0x03, 0x04] as const
const ZIP_EMPTY = [0x50, 0x4b, 0x05, 0x06] as const
const ZIP_SPANNED = [0x50, 0x4b, 0x07, 0x08] as const
const RIFF = [0x52, 0x49, 0x46, 0x46] as const
const WEBP = [0x57, 0x45, 0x42, 0x50] as const
const UTF8_BOM = [0xef, 0xbb, 0xbf] as const
const UTF16LE_BOM = [0xff, 0xfe] as const
const UTF16BE_BOM = [0xfe, 0xff] as const

function startsWith(bytes: Uint8Array, prefix: readonly number[]): boolean {
  return (
    bytes.length >= prefix.length &&
    prefix.every((value, index) => bytes[index] === value)
  )
}

function bytesEqualAt(
  bytes: Uint8Array,
  offset: number,
  prefix: readonly number[],
): boolean {
  return (
    bytes.length >= offset + prefix.length &&
    prefix.every((value, index) => bytes[offset + index] === value)
  )
}

function detectMagic(bytes: Uint8Array): DetectedFormat | null {
  if (startsWith(bytes, RIFF) && bytesEqualAt(bytes, 8, WEBP)) return 'webp'
  if (startsWith(bytes, PNG)) return 'png'
  if (startsWith(bytes, JPEG)) return 'jpeg'
  if (startsWith(bytes, GIF)) return 'gif'
  if (startsWith(bytes, PDF)) return 'pdf'
  if (startsWith(bytes, WASM)) return 'wasm'
  if (
    startsWith(bytes, ZIP_LOCAL) ||
    startsWith(bytes, ZIP_EMPTY) ||
    startsWith(bytes, ZIP_SPANNED)
  ) {
    return 'zip'
  }
  if (startsWith(bytes, GZIP)) return 'gzip'
  return null
}

function decodeText(bytes: Uint8Array, encoding: FileEncoding): string | null {
  try {
    return new TextDecoder(encoding, { fatal: true }).decode(bytes)
  } catch {
    return null
  }
}

function getEncodingFromBytes(bytes: Uint8Array): {
  encoding: FileEncoding
  bom: boolean
} {
  if (startsWith(bytes, UTF8_BOM)) return { encoding: 'utf-8', bom: true }
  if (startsWith(bytes, UTF16LE_BOM)) return { encoding: 'utf-16le', bom: true }
  if (startsWith(bytes, UTF16BE_BOM)) return { encoding: 'utf-16be', bom: true }
  return { encoding: 'utf-8', bom: false }
}

export function inspectFileBytes(bytes: Uint8Array): FileInspection {
  if (bytes.length === 0) {
    return { kind: 'text', encoding: 'utf-8', text: '', bom: false }
  }

  const format = detectMagic(bytes)
  if (isImageFormat(format)) {
    return { kind: 'image', format, mime: IMAGE_MIME_TYPES[format] }
  }
  if (format !== null) return { kind: 'binary', format }

  const { encoding, bom } = getEncodingFromBytes(bytes)
  if (!bom && bytes.includes(0)) return { kind: 'binary', format: null }

  const bytesToDecode = bom
    ? bytes.subarray(encoding === 'utf-8' ? 3 : 2)
    : bytes
  const text = decodeText(bytesToDecode, encoding)
  return text === null
    ? { kind: 'binary', format: null }
    : { kind: 'text', encoding, text, bom }
}

export function isImageFormat(
  format: DetectedFormat | null,
): format is ImageFormat {
  return format !== null && format in IMAGE_MIME_TYPES
}

export function formatLabel(format: DetectedFormat | null): string {
  return format === null ? 'Binary' : format.toUpperCase()
}
