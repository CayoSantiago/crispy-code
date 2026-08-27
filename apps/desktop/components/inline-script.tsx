export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
      suppressHydrationWarning
      // biome-ignore lint/security/noDangerouslySetInnerHtml: script is generated from fixed query keys
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
