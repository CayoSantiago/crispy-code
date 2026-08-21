import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '#generated/client'

// Used for one-off scripts (ping, seed, etc.)
export const createDBClient = () => {
  const url = process.env.DATABASE_URL
  if (!url) return { success: false as const, error: 'DATABASE_URL is not set' }

  const adapter = new PrismaPg({ connectionString: url })

  const client = new PrismaClient({ adapter })

  return { success: true as const, client }
}

export * from '#generated/client'
