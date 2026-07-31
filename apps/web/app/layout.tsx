import { Geist_Mono, Inter } from 'next/font/google'

import '@repo/ui/globals.css'
import { cn } from '@repo/ui/lib/utils'
import { ThemeProvider } from '@/components/theme-provider'
import { highlightCss } from '@/lib/highlight'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

const fontMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang='en'
      suppressHydrationWarning
      className={cn(
        'antialiased',
        fontMono.variable,
        'font-sans',
        inter.variable,
      )}
    >
      <body suppressHydrationWarning>
        <ThemeProvider>
          {children}
          {/** biome-ignore lint/security/noDangerouslySetInnerHtml: fine here */}
          <style dangerouslySetInnerHTML={{ __html: highlightCss }} />
        </ThemeProvider>
      </body>
    </html>
  )
}
