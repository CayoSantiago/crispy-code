export function getFilenameFromPath(filePath: string) {
  return filePath.split('/').pop()?.toLowerCase().trim() ?? ''
}

export function getFileExtension(filename: string) {
  const idx = filename.lastIndexOf('.')
  if (idx === -1) return ''
  return filename
    .slice(idx + 1)
    .toLowerCase()
    .trim()
}

export function getFilePathParts(filePath: string) {
  const segments = filePath.toLowerCase().split('/').filter(Boolean)
  const filename = segments.pop()?.trim() ?? ''
  const pathname = segments.join('/').trim()
  return { filename, pathname }
}
