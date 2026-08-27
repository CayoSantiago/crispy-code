import { open } from 'node:fs/promises'

export const FILE_VIEW_MAX_READ_BYTES = 4 * 1024 * 1024
export const FILE_VIEW_MAX_HEX_BYTES = 4 * 1024

export function formatKibLabel(bytes: number): string {
  return `${bytes / 1024} KB`
}

export type FilePrefix = {
  bytes: Buffer
  byteLength: number
  truncated: boolean
}

export async function readFilePrefix(
  filePath: string,
  maxBytes: number,
): Promise<FilePrefix> {
  const handle = await open(filePath, 'r')

  try {
    const { size } = await handle.stat()
    const toRead = Math.min(size, maxBytes)
    const bytes = Buffer.alloc(toRead)

    if (toRead > 0) {
      const { bytesRead } = await handle.read(bytes, 0, toRead, 0)
      return {
        bytes: bytes.subarray(0, bytesRead),
        byteLength: size,
        truncated: size > maxBytes,
      }
    }

    return { bytes, byteLength: size, truncated: false }
  } finally {
    await handle.close()
  }
}
