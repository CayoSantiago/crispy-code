import { resolve } from 'node:path'
import { PrismaPg } from '@prisma/adapter-pg'
import { config } from 'dotenv'
import { PrismaClient } from './generated/prisma/client.js'

config({
  path: [
    resolve(import.meta.dirname, '../../../.env'),
    resolve(import.meta.dirname, '../.env'),
    resolve(import.meta.dirname, '../../../.env.example'),
  ],
})

async function ping() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL is not set')
    process.exit(1)
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  })

  try {
    await prisma.$queryRaw`SELECT 1`
    console.log('Database connection OK')
  } catch (error) {
    console.error('Database connection failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

void ping()
