import { resolve } from 'node:path'
import { config } from 'dotenv'
import { createDBClient } from '#client'

config({
  path: [
    resolve(import.meta.dirname, '../.env.local'),
    resolve(import.meta.dirname, '../../../.env.local'),
    resolve(import.meta.dirname, '../../../.env'),
  ],
  quiet: true,
})

const db = createDBClient()

void (async () => {
  try {
    await db.$queryRaw`SELECT 1`
    console.log('Database connection OK')
  } catch (error) {
    console.error('Database connection failed:', error)
    process.exit(1)
  } finally {
    await db.$disconnect()
  }
})()
