import type { SearchFile, SearchGroup } from '@/features/find/schemas'

const MAX_FILES = 8
const MAX_MATCH_LINES = 30

export function capSearchGroups(groups: SearchGroup[]): SearchGroup[] {
  let remainingFiles = MAX_FILES
  let remainingMatches = MAX_MATCH_LINES
  const capped: SearchGroup[] = []

  for (const group of groups) {
    if (remainingFiles <= 0 || remainingMatches <= 0) {
      break
    }

    const files: SearchFile[] = []

    for (const file of group.files) {
      if (remainingFiles <= 0 || remainingMatches <= 0) {
        break
      }

      const next = capFile(file, remainingMatches)
      if (!next) {
        continue
      }

      files.push(next)
      remainingFiles -= 1
      remainingMatches -= next.matchCount
    }

    if (!files.length) {
      continue
    }

    capped.push({
      ...group,
      files,
      matchCount: files.reduce((sum, file) => sum + file.matchCount, 0),
    })
  }

  return capped
}

function capFile(
  file: SearchFile,
  remainingMatches: number,
): SearchFile | null {
  if (remainingMatches <= 0) {
    return null
  }

  const clusters = []
  let matchCount = 0

  for (const cluster of file.clusters) {
    const clusterMatches = cluster.lines.filter(
      (line) => line.kind === 'match',
    ).length

    if (clusterMatches === 0) {
      continue
    }

    if (matchCount + clusterMatches > remainingMatches) {
      break
    }

    clusters.push(cluster)
    matchCount += clusterMatches
  }

  if (!clusters.length) {
    return null
  }

  return {
    relativePath: file.relativePath,
    absolutePath: file.absolutePath,
    matchCount,
    clusters,
  }
}
