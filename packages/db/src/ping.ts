import { resolve } from 'node:path'
import { config } from 'dotenv'
import { createDBClient } from '#client'

config({
  path: [
    resolve(import.meta.dirname, '../../../.env'),
    resolve(import.meta.dirname, '../../../.env.example'),
  ],
})

const db = createDBClient()

if (!db.success) {
  console.error(db.error)
  process.exit(1)
}

void (async () => {
  try {
    await db.client.$queryRaw`SELECT 1`
    console.log('Database connection OK')
  } catch (error) {
    console.error('Database connection failed:', error)
    process.exit(1)
  } finally {
    await db.client.$disconnect()
  }
})()
