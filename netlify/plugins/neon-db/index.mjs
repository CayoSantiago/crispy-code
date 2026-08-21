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
