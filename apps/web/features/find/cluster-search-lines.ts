import type {
  SearchFile,
  SearchGroup,
  SearchLine,
} from '@/features/find/schemas'

export type SearchLineEvent = {
  sourceId: string
  sourceLabel: string
  sourceKind: 'local' | 'github'
  projectName: string
  absolutePath: string
  relativePath: string
  lineNumber: number
  lineText: string
  kind: 'match' | 'context'
  matchRanges: Array<{ start: number; end: number }>
}

function toSearchLine(event: SearchLineEvent): SearchLine {
  if (event.kind === 'match') {
    return {
      lineNumber: event.lineNumber,
      lineText: event.lineText,
      kind: 'match',
      matchRanges: event.matchRanges,
    }
  }

  return {
    lineNumber: event.lineNumber,
    lineText: event.lineText,
    kind: 'context',
  }
}

function buildFilesForEvents(events: SearchLineEvent[]): SearchFile[] {
  const files: SearchFile[] = []
  let currentFile: SearchFile | null = null
  let lastLineNumber = -1

  for (const event of events) {
    const needsNewFile =
      !currentFile || currentFile.absolutePath !== event.absolutePath

    if (needsNewFile) {
      currentFile = {
        relativePath: event.relativePath,
        absolutePath: event.absolutePath,
        matchCount: 0,
        clusters: [{ lines: [] }],
      }
      files.push(currentFile)
      lastLineNumber = -1
    }

    const needsNewCluster =
      lastLineNumber >= 0 && event.lineNumber > lastLineNumber + 1

    if (!currentFile) {
      continue
    }

    if (needsNewCluster) {
      currentFile.clusters.push({ lines: [] })
    }

    const cluster = currentFile.clusters.at(-1)
    if (!cluster) {
      continue
    }

    cluster.lines.push(toSearchLine(event))
    lastLineNumber = event.lineNumber

    if (event.kind === 'match') {
      currentFile.matchCount += 1
    }
  }

  return files
}

export function buildSearchGroups(events: SearchLineEvent[]): SearchGroup[] {
  const grouped = new Map<string, SearchLineEvent[]>()

  for (const event of events) {
    const key = `${event.sourceId}:${event.projectName}`
    const current = grouped.get(key)

    if (current) {
      current.push(event)
      continue
    }

    grouped.set(key, [event])
  }

  const groups: SearchGroup[] = []

  for (const projectEvents of grouped.values()) {
    const first = projectEvents[0]
    if (!first) {
      continue
    }

    const files = buildFilesForEvents(projectEvents)
    const matchCount = files.reduce((sum, file) => sum + file.matchCount, 0)

    groups.push({
      sourceId: first.sourceId,
      sourceLabel: first.sourceLabel,
      projectName: first.projectName,
      sourceKind: first.sourceKind,
      files,
      matchCount,
    })
  }

  return groups.sort((left, right) =>
    `${left.sourceLabel}/${left.projectName}`.localeCompare(
      `${right.sourceLabel}/${right.projectName}`,
    ),
  )
}

export function truncateFilesByMatchBudget(
  files: SearchFile[],
  maxMatches: number,
): SearchFile[] {
  if (maxMatches <= 0) {
    return []
  }

  const result: SearchFile[] = []
  let remaining = maxMatches

  for (const file of files) {
    if (remaining <= 0) {
      break
    }

    const clusters = []
    let fileMatchCount = 0

    for (const cluster of file.clusters) {
      const clusterMatchCount = cluster.lines.filter(
        (line) => line.kind === 'match',
      ).length

      if (clusterMatchCount === 0) {
        continue
      }

      if (clusterMatchCount > remaining) {
        remaining = 0
        break
      }

      clusters.push(cluster)
      fileMatchCount += clusterMatchCount
      remaining -= clusterMatchCount
    }

    if (clusters.length > 0) {
      result.push({
        relativePath: file.relativePath,
        absolutePath: file.absolutePath,
        matchCount: fileMatchCount,
        clusters,
      })
    }
  }

  return result
}
