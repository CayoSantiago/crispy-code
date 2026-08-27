import { planSearch, streamWriteAnswer } from '@/features/ask/gemini'
import type { AskHistoryTurn, SearchPlan } from '@/features/ask/schemas'
import { loadLocalSources, totalMatchCount } from '@/features/find/local-search'
import { registerFindTools } from '@/features/find/register-tools'
import type { SearchGroup } from '@/features/find/schemas'
import { publishTurnEvent } from '@/features/harness/events'
import { getTool } from '@/features/harness/tools'
import { updateTurn } from '@/lib/harness-db/turns'

type SearchLocalResult = {
  groups: SearchGroup[]
  missing: Array<{ id: string; label: string }>
  empty: boolean
}

export async function runAskTurn(input: {
  threadId: string
  turnId: string
  question: string
  history: AskHistoryTurn[]
}): Promise<void> {
  registerFindTools()
  publishTurnEvent(input.turnId, { type: 'stage', stage: 'PLANNING' })

  try {
    const sources = await loadLocalSources()
    if (!sources.available.length) {
      failTurn(input.turnId, 'No local folders configured for Ask.')
      return
    }

    let plan: SearchPlan
    let usedFallbackPlan = false

    try {
      plan = await planSearch({
        question: input.question,
        history: input.history,
      })
    } catch {
      usedFallbackPlan = true
      plan = {
        intent: 'solution',
        searches: [
          {
            query: input.question,
            pathGlob: '',
            mode: 'literal',
          },
        ],
      }
    }

    updateTurn(input.turnId, {
      intent: plan.intent,
      plannedQueries: plan.searches,
      usedFallbackPlan: usedFallbackPlan ? 1 : 0,
      searchStage: 'SEARCHING',
    })
    publishTurnEvent(input.turnId, { type: 'stage', stage: 'SEARCHING' })

    const searchTool = getTool('search_local')
    const searchResult = (await searchTool.execute({
      searches: plan.searches,
    })) as SearchLocalResult
    if (searchResult.empty) {
      failTurn(input.turnId, 'No local folders configured for Ask.')
      return
    }
    const totalMatches = totalMatchCount(searchResult.groups)

    updateTurn(input.turnId, {
      groups: searchResult.groups,
      totalMatches,
      missingSources: searchResult.missing,
      searchStage: 'WRITING',
    })
    publishTurnEvent(input.turnId, { type: 'stage', stage: 'WRITING' })

    const answer = await streamTurnAnswer({
      turnId: input.turnId,
      question: input.question,
      history: input.history,
      evidence: searchResult.groups,
    })

    updateTurn(input.turnId, {
      answer: answer || null,
      status: 'COMPLETED',
      searchStage: null,
      error: null,
    })
    publishTurnEvent(input.turnId, { type: 'done' })
  } catch (error) {
    failTurn(
      input.turnId,
      error instanceof Error ? error.message : 'Failed to answer the question.',
    )
  }
}

async function streamTurnAnswer(input: {
  turnId: string
  question: string
  history: AskHistoryTurn[]
  evidence: SearchGroup[]
}): Promise<string> {
  let answer = ''
  let lastPersist = 0

  const persistAnswer = (force = false) => {
    const now = Date.now()
    if (!force && now - lastPersist < 120) {
      return
    }
    lastPersist = now
    updateTurn(input.turnId, { answer: answer || null })
  }

  answer = await streamWriteAnswer({
    question: input.question,
    history: input.history,
    evidence: input.evidence,
    onThinking: (text) => {
      publishTurnEvent(input.turnId, {
        type: 'token',
        kind: 'thinking',
        text,
      })
    },
    onAnswer: (text) => {
      answer += text
      publishTurnEvent(input.turnId, {
        type: 'token',
        kind: 'answer',
        text,
      })
      persistAnswer()
    },
  })

  persistAnswer(true)
  return answer
}

function failTurn(turnId: string, message: string): void {
  updateTurn(turnId, {
    status: 'FAILED',
    searchStage: null,
    error: message,
  })
  publishTurnEvent(turnId, { type: 'error', message })
  publishTurnEvent(turnId, { type: 'done' })
}
