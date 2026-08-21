import type { ReactNode } from 'react'
import { Body, Container, Head, Html, Preview, Section } from 'react-email'

const body = {
  backgroundColor: '#f4f4f5',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  margin: '0',
  padding: '24px 0',
}

const container = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  margin: '0 auto',
  maxWidth: '560px',
  padding: '32px 24px',
}

export function EmailLayout({
  preview,
  children,
}: {
  preview: string
  children: ReactNode
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section>{children}</Section>
        </Container>
      </Body>
    </Html>
  )
}
