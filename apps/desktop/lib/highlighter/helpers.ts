import { getFilenameFromPath } from '@/lib/file'
import { highlighter } from '@/lib/highlighter'

const BY_FILENAME: Record<string, string> = {
  dockerfile: 'dockerfile',
  'nginx.conf': 'nginx',
}

export function languageForFilename(path: string): string {
  const filename = getFilenameFromPath(path)
  const byFilename = BY_FILENAME[filename]
  if (byFilename) return byFilename
  if (filename.startsWith('.env')) return 'env'

  const dot = filename.lastIndexOf('.')
  if (dot <= 0) return 'plaintext'
  return highlighter.normalizeLanguage(filename.slice(dot + 1))
}
