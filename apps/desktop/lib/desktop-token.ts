import { randomUUID, timingSafeEqual } from 'node:crypto'

export const DESKTOP_RPC_TOKEN_COOKIE = 'desktop-rpc-token'

const configuredToken = process.env.DESKTOP_RPC_TOKEN?.trim()

export const DESKTOP_RPC_TOKEN =
  configuredToken && configuredToken.length >= 32
    ? configuredToken
    : randomUUID()

process.env.DESKTOP_RPC_TOKEN = DESKTOP_RPC_TOKEN

function isLoopbackHost(host: string | null): boolean {
  if (!host) return false

  return /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/i.test(host.trim())
}

function tokenMatches(candidate: string | null): boolean {
  if (!candidate) return false

  const expected = Buffer.from(DESKTOP_RPC_TOKEN)
  const actual = Buffer.from(candidate)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

function getCookie(headers: Headers, name: string): string | null {
  const cookieHeader = headers.get('cookie')
  if (!cookieHeader) return null

  for (const entry of cookieHeader.split(';')) {
    const separator = entry.indexOf('=')
    if (separator < 0 || entry.slice(0, separator).trim() !== name) continue

    try {
      return decodeURIComponent(entry.slice(separator + 1).trim())
    } catch {
      return null
    }
  }

  return null
}

export function isDesktopRequestAuthorized(headers: Headers): boolean {
  if (!isLoopbackHost(headers.get('host'))) return false

  return (
    tokenMatches(headers.get('x-desktop-token')) ||
    tokenMatches(getCookie(headers, DESKTOP_RPC_TOKEN_COOKIE))
  )
}
