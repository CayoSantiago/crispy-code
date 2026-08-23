const SENSITIVE_KEYS = new Set([
  'to',
  'email',
  'password',
  'token',
  'secret',
  'authorization',
  'cookie',
  'accesstoken',
  'refreshtoken',
  'idtoken',
])

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') {
    return false
  }

  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

export function redact<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => redact(item)) as T
  }

  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(value)) {
      result[key] = SENSITIVE_KEYS.has(key.toLowerCase())
        ? '[redacted]'
        : redact(nested)
    }
    return result as T
  }

  return value
}
