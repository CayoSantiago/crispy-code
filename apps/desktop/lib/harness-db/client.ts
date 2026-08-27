import 'server-only'

import { readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import { ensureDir } from '@/lib/fs'

const dbDir = path.join(os.homedir(), '.crispy-code')
const dbPath = path.join(dbDir, 'ask.sqlite')

await ensureDir(dbDir)

const schema = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'schema.sql'),
  'utf8',
)

const db = new DatabaseSync(dbPath)
db.exec('PRAGMA foreign_keys = ON')
db.exec(schema)

export function getDb(): DatabaseSync {
  return db
}
