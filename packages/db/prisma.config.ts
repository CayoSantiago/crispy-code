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

// #region agent log
{
  const raw = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
  const source = process.env.DATABASE_URL_UNPOOLED
    ? 'DATABASE_URL_UNPOOLED'
    : 'DATABASE_URL'
  let hostname = null
  let parseError = null
  try {
    hostname = raw ? new URL(raw.trim()).hostname : null
  } catch (error) {
    parseError = error instanceof Error ? error.message : 'parse-failed'
  }
  const shape = {
    source,
    present: Boolean(raw),
    length: raw?.length ?? 0,
    startsWithQuote: raw ? /^['"]/.test(raw) : false,
    endsWithQuote: raw ? /['"]$/.test(raw) : false,
    hasBrackets: raw ? /[[\]]/.test(raw) : false,
    atCount: raw ? (raw.match(/@/g) ?? []).length : 0,
    scheme: raw?.trim().split(':')[0] ?? null,
    hostname,
    parseError,
    hasPooler: Boolean(hostname?.includes('-pooler') || raw?.includes('-pooler')),
  }
  console.error('[debug-7e3f8b] prisma.config datasource url shape', shape)
  fetch('http://127.0.0.1:7584/ingest/712db9e9-91cf-405d-8c89-1f48a371393b', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '7e3f8b',
    },
    body: JSON.stringify({
      sessionId: '7e3f8b',
      runId: 'p1013',
      hypothesisId: 'H1-H5',
      location: 'packages/db/prisma.config.ts',
      message: 'prisma datasource url shape',
      data: shape,
      timestamp: Date.now(),
    }),
  }).catch(() => undefined)
}
// #endregion

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
