import 'server-only'

import { PrismaPg } from '@prisma/adapter-pg'
import { env } from '@repo/env/server'
import { Pool } from 'pg'
import { PrismaClient } from '#generated/client'

let _db: PrismaClient | null = null

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 1, // 1 connection per instance for lambdas
  idleTimeoutMillis: 120000,
  connectionTimeoutMillis: 10000,
})

const adapter = new PrismaPg(pool)

const getDb = () => {
  if (_db) return _db
  _db = new PrismaClient({ adapter })
  return _db
}

export const db = new Proxy({} as PrismaClient, {
  get: (_, prop) => getDb()[prop as keyof PrismaClient],
})
