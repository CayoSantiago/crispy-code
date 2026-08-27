import { randomUUID } from 'node:crypto'
import { getDb } from '@/lib/harness-db/client'
import {
  type TurnDbRow,
  type TurnRow,
  rowToTurn,
} from '@/lib/harness-db/turns'

type ThreadRow = {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export function createThread(input: { title: string }): {
  id: string
  title: string
  createdAt: string
  updatedAt: string
} {
  const db = getDb()
  const id = randomUUID()
  const timestamp = new Date().toISOString()

  db.prepare(
    'INSERT INTO ask_thread (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)',
  ).run(id, input.title, timestamp, timestamp)

  return {
    id,
    title: input.title,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function listThreads(): Array<{
  id: string
  title: string
  updatedAt: string
  createdAt: string
}> {
  const rows = getDb()
    .prepare(
      'SELECT id, title, created_at, updated_at FROM ask_thread ORDER BY updated_at DESC',
    )
    .all() as ThreadRow[]

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

export function getThread(id: string): {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  turns: TurnRow[]
} | null {
  const db = getDb()
  const thread = db
    .prepare('SELECT id, title, created_at, updated_at FROM ask_thread WHERE id = ?')
    .get(id) as ThreadRow | undefined

  if (!thread) {
    return null
  }

  const turnRows = db
    .prepare(
      'SELECT * FROM ask_turn WHERE thread_id = ? ORDER BY created_at ASC',
    )
    .all(id) as TurnDbRow[]

  return {
    id: thread.id,
    title: thread.title,
    createdAt: thread.created_at,
    updatedAt: thread.updated_at,
    turns: turnRows.map(rowToTurn),
  }
}

export function deleteThread(id: string): boolean {
  const result = getDb()
    .prepare('DELETE FROM ask_thread WHERE id = ?')
    .run(id)

  return result.changes > 0
}

export function renameThread(id: string, title: string): boolean {
  const result = getDb()
    .prepare('UPDATE ask_thread SET title = ? WHERE id = ?')
    .run(title, id)

  return result.changes > 0
}
