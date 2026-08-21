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

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx src/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL_UNPOOLED || env('DATABASE_URL'),
  },
})
