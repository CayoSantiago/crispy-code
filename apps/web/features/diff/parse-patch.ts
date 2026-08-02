import type { HighlightDecoration } from '@tanstack/highlight/core'

export type ParsedPatch = {
  code: string
  decorations: HighlightDecoration[]
}

type LineClass =
  | 'th-line--deleted'
  | 'th-line--highlighted'
  | 'th-line--inserted'

/**
 * Converts a GitHub unified diff into highlightable source plus per-line
 * decorations. Markers are stripped from the code so the file's real language
 * highlights correctly, and the add/remove signal moves into decorations.
 *
 * Gutter numbers are therefore diff-relative, not true file line numbers.
 */
export function parsePatch(patch: string): ParsedPatch {
  const codeLines: string[] = []
  const lineClasses: Array<LineClass | null> = []

  for (const line of patch.split('\n')) {
    // '\ No newline at end of file' is diff metadata, not file content.
    if (line.startsWith('\\')) {
      continue
    }

    if (line.startsWith('@@')) {
      // codeLines.push(line)
      // lineClasses.push('th-line--highlighted')
      continue
    }

    if (line.startsWith('+')) {
      codeLines.push(line.slice(1))
      lineClasses.push('th-line--inserted')
      continue
    }

    if (line.startsWith('-')) {
      codeLines.push(line.slice(1))
      lineClasses.push('th-line--deleted')
      continue
    }

    codeLines.push(line.startsWith(' ') ? line.slice(1) : line)
    lineClasses.push(null)
  }

  return {
    code: codeLines.join('\n'),
    decorations: toDecorations(lineClasses),
  }
}

/**
 * Collapses runs of identically classed lines into single range decorations.
 * Line coordinates are one-based and inclusive.
 */
function toDecorations(
  lineClasses: ReadonlyArray<LineClass | null>,
): HighlightDecoration[] {
  const decorations: HighlightDecoration[] = []
  let index = 0

  while (index < lineClasses.length) {
    const className = lineClasses[index]

    if (!className) {
      index += 1
      continue
    }

    let end = index
    while (end + 1 < lineClasses.length && lineClasses[end + 1] === className) {
      end += 1
    }

    decorations.push(
      index === end
        ? { className, lines: index + 1 }
        : { className, lines: [index + 1, end + 1] },
    )

    index = end + 1
  }

  return decorations
}
