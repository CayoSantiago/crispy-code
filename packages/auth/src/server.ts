import 'server-only'

import { getDb } from '@repo/db'
import { createAuth } from '#config'

export const auth = createAuth(getDb())

export type Session = typeof auth.$Infer.Session
