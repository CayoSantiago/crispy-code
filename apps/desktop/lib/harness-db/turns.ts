import { randomUUID } from 'node:crypto'
import type { SQLInputValue } from 'node:sqlite'
import { getDb } from '@/lib/harness-db/client'

export type TurnRow = {
  id: string
  threadId: string
  question: string
  answer: string | null
  intent: string | null
  plannedQueries: unknown | null
  usedFallbackPlan: number // 0|1
  groups: unknown | null
  totalMatches: number | null
  missingSources: unknown | null
  searchStage: 'PLANNING' | 'SEARCHING' | 'WRITING' | null
  status: 'RUNNING' | 'COMPLETED' | 'FAILED'
  error: string | null
  createdAt: string
}

export type TurnUpdatePatch = Partial<
  Pick<
    TurnRow,
    | 'answer'
    | 'intent'
    | 'plannedQueries'
    | 'usedFallbackPlan'
    | 'groups'
    | 'totalMatches'
    | 'missingSources'
    | 'searchStage'
    | 'status'
    | 'error'
  >
>

export type TurnDbRow = {
  id: string
  thread_id: string
  question: string
  answer: string | null
  intent: string | null
  planned_queries: string | null
  used_fallback_plan: number
  groups: string | null
  total_matches: number | null
  missing_sources: string | null
  search_stage: TurnRow['searchStage']
  status: TurnRow['status']
  error: string | null
  created_at: string
}

function parseJsonColumn(value: string | null): unknown | null {
  if (value === null) {
    return null
  }

  return JSON.parse(value)
}

function stringifyJsonColumn(value: unknown | null): string | null {
  if (value === null) {
    return null
  }

  return JSON.stringify(value)
}

export function rowToTurn(row: TurnDbRow): TurnRow {
  return {
    id: row.id,
    threadId: row.thread_id,
    question: row.question,
    answer: row.answer,
    intent: row.intent,
    plannedQueries: parseJsonColumn(row.planned_queries),
    usedFallbackPlan: row.used_fallback_plan,
    groups: parseJsonColumn(row.groups),
    totalMatches: row.total_matches,
    missingSources: parseJsonColumn(row.missing_sources),
    searchStage: row.search_stage,
    status: row.status,
    error: row.error,
    createdAt: row.created_at,
  }
}

export function createTurn(input: {
  threadId: string
  question: string
}): TurnRow {
  const db = getDb()
  const id = randomUUID()
  const createdAt = new Date().toISOString()
  const updatedAt = createdAt

  db.prepare(
    `INSERT INTO ask_turn (
      id,
      thread_id,
      question,
      status,
      search_stage,
      created_at
    ) VALUES (?, ?, ?, 'RUNNING', 'PLANNING', ?)`,
  ).run(id, input.threadId, input.question, createdAt)

  db.prepare('UPDATE ask_thread SET updated_at = ? WHERE id = ?').run(
    updatedAt,
    input.threadId,
  )

  return rowToTurn(
    db
      .prepare('SELECT * FROM ask_turn WHERE id = ?')
      .get(id) as TurnDbRow,
  )
}

export function updateTurn(id: string, patch: TurnUpdatePatch): TurnRow | null {
  const sets: string[] = []
  const values: SQLInputValue[] = []

  if (patch.answer !== undefined) {
    sets.push('answer = ?')
    values.push(patch.answer)
  }
  if (patch.intent !== undefined) {
    sets.push('intent = ?')
    values.push(patch.intent)
  }
  if (patch.plannedQueries !== undefined) {
    sets.push('planned_queries = ?')
    values.push(stringifyJsonColumn(patch.plannedQueries))
  }
  if (patch.usedFallbackPlan !== undefined) {
    sets.push('used_fallback_plan = ?')
    values.push(patch.usedFallbackPlan)
  }
  if (patch.groups !== undefined) {
    sets.push('groups = ?')
    values.push(stringifyJsonColumn(patch.groups))
  }
  if (patch.totalMatches !== undefined) {
    sets.push('total_matches = ?')
    values.push(patch.totalMatches)
  }
  if (patch.missingSources !== undefined) {
    sets.push('missing_sources = ?')
    values.push(stringifyJsonColumn(patch.missingSources))
  }
  if (patch.searchStage !== undefined) {
    sets.push('search_stage = ?')
    values.push(patch.searchStage)
  }
  if (patch.status !== undefined) {
    sets.push('status = ?')
    values.push(patch.status)
  }
  if (patch.error !== undefined) {
    sets.push('error = ?')
    values.push(patch.error)
  }

  if (sets.length === 0) {
    return getTurn(id)
  }

  values.push(id)
  getDb()
    .prepare(`UPDATE ask_turn SET ${sets.join(', ')} WHERE id = ?`)
    .run(...values)

  return getTurn(id)
}

export function getTurn(id: string): TurnRow | null {
  const row = getDb()
    .prepare('SELECT * FROM ask_turn WHERE id = ?')
    .get(id) as TurnDbRow | undefined

  return row ? rowToTurn(row) : null
}

export function threadHasRunningTurn(threadId: string): boolean {
  const row = getDb()
    .prepare(
      'SELECT 1 AS found FROM ask_turn WHERE thread_id = ? AND status = ? LIMIT 1',
    )
    .get(threadId, 'RUNNING') as { found: number } | undefined

  return row !== undefined
}
