import { createDBClient } from '#client'

const db = createDBClient()

void (async () => {
  try {
    // TODO: Seed script
    console.log('Database seeded')
  } catch (error) {
    console.error('Database seeding failed:', error)
    process.exit(1)
  } finally {
    await db.$disconnect()
  }
})()
