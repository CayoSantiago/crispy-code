import 'server-only'

import { AskSearchStage, AskTurnStatus, db, type Prisma } from '@repo/db'
import { inngest } from '@repo/jobs/client'
import { planSearch, streamWriteAnswer } from '@/features/ask/gemini'
import { askRun } from '@/features/ask/inngest/event'
import { askTurnChannel } from '@/features/ask/realtime'
import type { AskHistoryTurn, SearchPlan } from '@/features/ask/schemas'
import {
  loadLocalSources,
  runLocalSearches,
  totalMatchCount,
} from '@/features/ask/search-local'
import type { SearchGroup } from '@/features/find/schemas'

export const askRunFn = inngest.createFunction(
  {
    id: 'ask-run',
    retries: 3,
    concurrency: 5,
    triggers: [askRun],
    onFailure: async ({ event, error }) => {
      const original = event.data.event
      const turnId = original.data?.turnId
      if (typeof turnId !== 'string') {
        return
      }

      await markTurnFailed(turnId, error.message)
    },
  },
  async ({ event, step }) => {
    const { threadId, turnId, question, history } = event.data

    const sources = await step.run('load-local-sources', async () =>
      loadLocalSources(),
    )

    if (!sources.available.length) {
      await step.run('fail-empty-sources', async () =>
        markTurnFailed(turnId, 'No local folders configured for Ask.'),
      )
      return { turnId, empty: true }
    }

    let plan: SearchPlan
    let usedFallbackPlan = false

    try {
      plan = await step.ai.wrap('plan-search', planSearch, {
        question,
        history,
      })
    } catch {
      usedFallbackPlan = true
      plan = await step.run('fallback-plan', async () => ({
        intent: 'solution' as const,
        searches: [
          {
            query: question,
            pathGlob: '',
            mode: 'literal' as const,
          },
        ],
      }))
    }

    await step.run('persist-plan', async () =>
      db.askTurn.update({
        where: { id: turnId },
        data: {
          intent: plan.intent,
          plannedQueries: plan.searches as Prisma.InputJsonValue,
          usedFallbackPlan,
          searchStage: AskSearchStage.SEARCHING,
        },
      }),
    )

    const groups = await step.run('ripgrep', async () =>
      runLocalSearches(sources.available, plan.searches),
    )

    const totalMatches = totalMatchCount(groups)

    await step.run('persist-search', async () =>
      db.askTurn.update({
        where: { id: turnId },
        data: {
          groups: groups as Prisma.InputJsonValue,
          totalMatches,
          missingSources: sources.missing as Prisma.InputJsonValue,
          searchStage:
            totalMatches > 0
              ? AskSearchStage.WRITING
              : AskSearchStage.SEARCHING,
        },
      }),
    )

    let answer: string | null = null
    if (totalMatches > 0) {
      try {
        answer = await step.run('write-answer', async () =>
          streamTurnAnswer({
            threadId,
            turnId,
            question,
            history,
            evidence: groups,
          }),
        )
      } catch (error) {
        await markTurnFailed(
          turnId,
          error instanceof Error
            ? error.message
            : 'Failed to write the answer.',
        )
        return { turnId, totalMatches, failed: true }
      }
    }

    await step.run('persist-turn', async () =>
      persistTurn({
        threadId,
        turnId,
        answer,
        intent: plan.intent,
        plannedQueries: plan.searches,
        usedFallbackPlan,
        groups,
        totalMatches,
        missingSources: sources.missing,
      }),
    )

    return { turnId, totalMatches }
  },
)

async function streamTurnAnswer(input: {
  threadId: string
  turnId: string
  question: string
  history: AskHistoryTurn[]
  evidence: SearchGroup[]
}) {
  let answer = ''
  let lastPersist = 0
  const topic = askTurnChannel({ turnId: input.turnId }).tokens

  const persistAnswer = async (force = false) => {
    const now = Date.now()
    if (!force && now - lastPersist < 120) {
      return
    }
    lastPersist = now
    await db.askTurn.update({
      where: { id: input.turnId },
      data: { answer: answer || null },
    })
    await db.askThread.update({
      where: { id: input.threadId },
      data: { updatedAt: new Date() },
    })
  }

  const publish = async (kind: 'thinking' | 'answer', text: string) => {
    try {
      await inngest.realtime.publish(topic, { kind, text })
    } catch {
      // Session-only Thinking; a missed token should not fail the turn.
    }
  }

  answer = await streamWriteAnswer({
    question: input.question,
    history: input.history,
    evidence: input.evidence,
    onThinking: async (text) => {
      await publish('thinking', text)
    },
    onAnswer: async (text) => {
      answer += text
      await publish('answer', text)
      await persistAnswer()
    },
  })

  await persistAnswer(true)
  return answer
}

async function persistTurn(input: {
  threadId: string
  turnId: string
  answer: string | null
  intent: string | null
  plannedQueries: SearchPlan['searches']
  usedFallbackPlan: boolean
  groups: SearchGroup[]
  totalMatches: number
  missingSources: Array<{ id: string; label: string }>
}) {
  await db.askTurn.update({
    where: { id: input.turnId },
    data: {
      answer: input.answer,
      intent: input.intent,
      plannedQueries: input.plannedQueries as Prisma.InputJsonValue,
      usedFallbackPlan: input.usedFallbackPlan,
      groups: input.groups as Prisma.InputJsonValue,
      totalMatches: input.totalMatches,
      missingSources: input.missingSources as Prisma.InputJsonValue,
      searchStage: null,
      status: AskTurnStatus.COMPLETED,
      error: null,
    },
  })

  await db.askThread.update({
    where: { id: input.threadId },
    data: { updatedAt: new Date() },
  })
}

async function markTurnFailed(turnId: string, message: string) {
  const turn = await db.askTurn.findUnique({ where: { id: turnId } })
  if (!turn || turn.status !== AskTurnStatus.RUNNING) {
    return
  }

  await db.askTurn.update({
    where: { id: turnId },
    data: {
      status: AskTurnStatus.FAILED,
      searchStage: null,
      error: message,
    },
  })

  await db.askThread.update({
    where: { id: turn.threadId },
    data: { updatedAt: new Date() },
  })
}
