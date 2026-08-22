import '@repo/ui/globals.css'
import '@/lib/orpc/client.server'

import { env } from '@repo/env/next'
import { TooltipProvider } from '@repo/ui/components/tooltip'
import { cn } from '@repo/ui/lib/utils'
import type { Metadata } from 'next'
import { Geist_Mono, Inter } from 'next/font/google'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { Providers } from '@/app/providers'
import { ThemeProvider } from '@/components/theme-provider'
import { HighligherStyles } from '@/lib/highlighter/theme'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

const fontMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: {
    template: '%s | Crispy Code',
    default: 'Crispy Code',
  },
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
}

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
