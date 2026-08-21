import 'server-only'

import { db } from '@repo/db'
import { createAuth } from '#config'

export const auth = createAuth(db)

export type Session = typeof auth.$Infer.Session
