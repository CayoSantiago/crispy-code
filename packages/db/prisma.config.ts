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
