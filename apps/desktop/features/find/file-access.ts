import { realpath } from 'node:fs/promises'
import path from 'node:path'

function isInsideRoot(candidate: string, root: string): boolean {
  const relative = path.relative(root, candidate)
  return (
    relative.length > 0 &&
    !relative.startsWith('..') &&
    !path.isAbsolute(relative)
  )
}

export async function resolveFileWithinRoots(
  inputPath: string,
  configuredRoots: string[],
): Promise<string | null> {
  const candidate = path.resolve(inputPath)

  for (const configuredRoot of configuredRoots) {
    const root = path.resolve(configuredRoot)
    if (!isInsideRoot(candidate, root)) continue

    try {
      const [realCandidate, realRoot] = await Promise.all([
        realpath(candidate),
        realpath(root),
      ])
      if (isInsideRoot(realCandidate, realRoot)) {
        return realCandidate
      }
    } catch {
      // Missing and unreadable paths are not available through the file viewer.
    }
  }

  return null
}
