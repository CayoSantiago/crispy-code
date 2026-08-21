import { resolve } from 'node:path'
import { config } from 'dotenv'
import { defineConfig, env } from 'prisma/config'

config({
  path: [
    resolve(import.meta.dirname, './.env.local'),
    resolve(import.meta.dirname, '../../.env.local'),
    resolve(import.meta.dirname, '../../.env'),
  ],
  quiet: true,
})

const datasourceUrl =
  process.env.DATABASE_URL_UNPOOLED || env('DATABASE_URL')

function describePgUrl(raw: string | undefined, source: string) {
  const trimmed = raw?.trim() ?? ''
  const hostPart = trimmed.split('@')[1]?.split('/')[0] ?? ''
  const userInfoPart = trimmed.split('@')[0] ?? ''
  let hostname: string | null = null
  let parseError: string | null = null
  try {
    hostname = trimmed ? new URL(trimmed).hostname : null
  } catch (error) {
    parseError = error instanceof Error ? error.message : 'parse-failed'
  }
  return {
    source,
    present: Boolean(raw),
    length: raw?.length ?? 0,
    startsWithQuote: raw ? /^['"]/.test(raw) : false,
    endsWithQuote: raw ? /['"]$/.test(raw) : false,
    hasBrackets: raw ? /[[\]]/.test(raw) : false,
    userInfoHasBrackets: /[[\]]/.test(userInfoPart),
    hostHasBrackets: /[[\]]/.test(hostPart),
    hostLooksBracketWrapped: /^\[[^\]]+\](:\d+)?$/.test(hostPart),
    atCount: raw ? (raw.match(/@/g) ?? []).length : 0,
    scheme: trimmed.split(':')[0] || null,
    hostname,
    parseError,
    hasQuery: trimmed.includes('?'),
    hasPooler: Boolean(hostname?.includes('-pooler') || trimmed.includes('-pooler')),
  }
}

// #region agent log
{
  const unpooledShape = describePgUrl(
    process.env.DATABASE_URL_UNPOOLED,
    'DATABASE_URL_UNPOOLED',
  )
  const pooledShape = describePgUrl(process.env.DATABASE_URL, 'DATABASE_URL')
  const chosenShape = describePgUrl(
    datasourceUrl,
    process.env.DATABASE_URL_UNPOOLED
      ? 'DATABASE_URL_UNPOOLED'
      : 'DATABASE_URL',
  )
  console.error('[debug-7e3f8b] prisma.config url shapes', {
    chosen: chosenShape,
    unpooled: unpooledShape,
    pooled: pooledShape,
  })
  fetch('http://127.0.0.1:7584/ingest/712db9e9-91cf-405d-8c89-1f48a371393b', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '7e3f8b',
    },
    body: JSON.stringify({
      sessionId: '7e3f8b',
      runId: 'p1013-b',
      hypothesisId: 'H2-H3',
      location: 'packages/db/prisma.config.ts',
      message: 'prisma datasource url shapes',
      data: { chosen: chosenShape, unpooled: unpooledShape, pooled: pooledShape },
      timestamp: Date.now(),
    }),
  }).catch(() => undefined)
}
// #endregion

try {
  new URL(datasourceUrl)
} catch {
  throw new Error(
    'DATABASE_URL_UNPOOLED (or DATABASE_URL) is not a valid PostgreSQL URL. Prisma reports this as an invalid IPv6 address when the string contains "[" or "]". In the Neon Console, open Connect, copy the Direct (non-pooler) connection string, and paste it into Netlify as DATABASE_URL_UNPOOLED with no quotes and no placeholders like [user] or [endpoint].',
  )
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx src/seed.ts',
  },
  datasource: {
    url: datasourceUrl,
  },
})
