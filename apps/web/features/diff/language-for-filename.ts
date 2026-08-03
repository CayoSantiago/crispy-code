import { getFilenameFromPath } from '@/lib/file'
import { highlighter } from '@/lib/highlight'

const BY_FILENAME: Record<string, string> = {
  dockerfile: 'dockerfile',
  'nginx.conf': 'nginx',
}

/**
 * Resolves a repository file path to a language registered on the highlighter.
 * Anything unrecognised falls back to plain text, which still renders correctly.
 */
export function languageForFilename(path: string): string {
  const filename = getFilenameFromPath(path)

  const byFilename = BY_FILENAME[filename]
  if (byFilename) return byFilename

  // Covers .env, .env.local, .env.production and friends.
  if (filename.startsWith('.env')) {
    return 'env'
  }

  const dot = filename.lastIndexOf('.')

  // A leading dot means a dotfile such as .gitignore, not an extension.
  if (dot <= 0) {
    return 'plaintext'
  }

  return highlighter.normalizeLanguage(filename.slice(dot + 1))
}
