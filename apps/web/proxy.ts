import { auth } from '@repo/auth/server'
import { getCookieCache } from 'better-auth/cookies'
import { type NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
  const cookieSession = await getCookieCache(request)

  if (!cookieSession) {
    const dbSession = await auth.api.getSession({ headers: request.headers })

    if (!dbSession) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/ask/:path*',
}
