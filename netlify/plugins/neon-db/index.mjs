import { spawnSync } from 'node:child_process'

function parseResolveEnvOutput(stdout) {
  const jsonLine = stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('{'))
    .at(-1)

  if (!jsonLine) {
    throw new Error('db:resolve-env did not print JSON on stdout')
  }

  const urls = JSON.parse(jsonLine)
  if (
    typeof urls.DATABASE_URL !== 'string' ||
    typeof urls.DATABASE_URL_UNPOOLED !== 'string'
  ) {
    throw new Error('db:resolve-env returned incomplete database URLs')
  }

  return urls
}

export const onPreBuild = ({ utils }) => {
  const resolved = spawnSync(
    'pnpm',
    ['--filter', '@repo/db', '--silent', 'db:resolve-env'],
    {
      encoding: 'utf8',
      env: process.env,
    },
  )

  if (resolved.status !== 0) {
    if (resolved.stderr) {
      console.error(resolved.stderr)
    }
    return utils.build.failBuild('Failed to resolve database URLs')
  }

  let urls
  try {
    urls = parseResolveEnvOutput(resolved.stdout)
  } catch {
    return utils.build.failBuild('db:resolve-env did not print JSON on stdout')
  }

  process.env.DATABASE_URL = urls.DATABASE_URL
  process.env.DATABASE_URL_UNPOOLED = urls.DATABASE_URL_UNPOOLED

  // #region agent log
  {
    const raw = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
    const shape = {
      context: process.env.CONTEXT ?? null,
      hasPooled: Boolean(process.env.DATABASE_URL),
      hasUnpooled: Boolean(process.env.DATABASE_URL_UNPOOLED),
      unpooledLength: process.env.DATABASE_URL_UNPOOLED?.length ?? 0,
      pooledLength: process.env.DATABASE_URL?.length ?? 0,
      startsWithQuote: raw ? /^['"]/.test(raw) : false,
      hasBrackets: raw ? /[[\]]/.test(raw) : false,
      atCount: raw ? (raw.match(/@/g) ?? []).length : 0,
      hasPooler: Boolean(raw?.includes('-pooler')),
    }
    console.log('[debug-7e3f8b] neon-db url shape', shape)
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
        location: 'netlify/plugins/neon-db/index.mjs:onPreBuild',
        message: 'plugin url shape before migrate',
        data: shape,
        timestamp: Date.now(),
      }),
    }).catch(() => undefined)
  }
  // #endregion

  if (process.env.CONTEXT !== 'production' && process.env.DEPLOY_PRIME_URL) {
    process.env.BETTER_AUTH_URL = process.env.DEPLOY_PRIME_URL
  }

  const migrate = spawnSync('pnpm', ['db:deploy'], {
    stdio: 'inherit',
    env: process.env,
  })

  if (migrate.status !== 0) {
    return utils.build.failBuild('prisma migrate deploy failed')
  }
}
