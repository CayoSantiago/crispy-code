export function assertAllowedEmailUrl(url: string, allowedBaseUrl: string) {
  let parsed: URL
  let allowed: URL
  try {
    parsed = new URL(url)
    allowed = new URL(allowedBaseUrl)
  } catch {
    throw new Error('Invalid email destination URL')
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Email destination URL must be http or https')
  }

  if (parsed.origin !== allowed.origin) {
    throw new Error('Email destination URL origin is not allowed')
  }
}
