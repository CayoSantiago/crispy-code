import '@repo/ui/globals.css'
import { cn } from '@repo/ui/lib/utils'

import type { Metadata } from 'next'
import { Geist_Mono, Inter } from 'next/font/google'
import { Providers } from '@/app/providers'
import { ThemeProvider } from '@/components/theme-provider'

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
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
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
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
