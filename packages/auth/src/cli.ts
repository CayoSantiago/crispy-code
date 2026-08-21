import type { PrismaClient } from '@repo/db/client'
import { createDBClient } from '@repo/db/client'
import { createAuth } from '#config'

const db = createDBClient()
const prisma = db.success ? db.client : ({} as PrismaClient)

export const auth = createAuth(prisma)
