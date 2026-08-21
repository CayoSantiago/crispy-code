import { Geist_Mono, Inter } from 'next/font/google'

import '@repo/ui/globals.css'
import { cn } from '@repo/ui/lib/utils'
import { Providers } from '@/app/providers'
import { ThemeProvider } from '@/components/theme-provider'
import { HighligherStyles } from '@/lib/highlighter/theme'
import '@/lib/orpc/client.server'
import { TooltipProvider } from '@repo/ui/components/tooltip'
import { NuqsAdapter } from 'nuqs/adapters/next/app'

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
      data-scroll-behavior='smooth'
      className={cn(
        'antialiased',
        fontMono.variable,
        'font-sans',
        inter.variable,
        'scroll-smooth',
      )}
    >
      <body suppressHydrationWarning>
        <ThemeProvider>
          <TooltipProvider delay={600}>
            <Providers>
              <NuqsAdapter>{children}</NuqsAdapter>
            </Providers>
          </TooltipProvider>
        </ThemeProvider>

        <HighligherStyles />
      </body>
    </html>
  )
}
