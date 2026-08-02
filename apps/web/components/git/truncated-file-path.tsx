export function TruncatedFilePath({ filePath }: { filePath: string }) {
  const segments = filePath?.split('/').filter(Boolean) ?? []
  const [filename = ''] = segments.slice(-1)
  const pathname = segments.slice(0, -1).join('/')

  return (
    <>
      <span className='truncate text-muted-foreground'>{pathname}</span>
      <span className='text-muted-foreground'>/</span>
      <span className='text-foreground'>{filename}</span>
    </>
  )
}
