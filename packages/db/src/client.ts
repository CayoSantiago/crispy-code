import { PrismaPg } from '@prisma/adapter-pg'
import { env } from '@repo/env/server'
import { PrismaClient } from '#generated/client'

// Used for one-off scripts (ping, seed, etc.)
export const createDBClient = () => {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
  })
}

export * from '#generated/client'
