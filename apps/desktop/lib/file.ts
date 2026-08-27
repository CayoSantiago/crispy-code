export function getFilenameFromPath(filePath: string) {
  return filePath.split('/').at(-1)?.toLowerCase().trim() ?? ''
}

export function getFilePathParts(filePath: string) {
  const segments = filePath.toLowerCase().split('/').filter(Boolean)
  const filename = segments.pop()?.trim() ?? ''
  const pathname = segments.join('/').trim()
  return { filename, pathname }
}
