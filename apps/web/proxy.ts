import { auth } from '@repo/auth/server'
import { getCookieCache } from 'better-auth/cookies'
import { type NextRequest, NextResponse } from 'next/server'

const PROTECTED_ROUTES = ['/ask']

export async function proxy(request: NextRequest) {
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    request.nextUrl.pathname.startsWith(route),
  )

  if (!isProtectedRoute) return NextResponse.next()

  const cookieSession = await getCookieCache(request)

  if (!cookieSession) {
    const dbSession = await auth.api.getSession({ headers: request.headers })

    if (!dbSession) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}
