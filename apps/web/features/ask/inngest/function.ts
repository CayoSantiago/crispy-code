import 'server-only'

import { AskTurnStatus, db, type Prisma } from '@repo/db'
import { inngest } from '@repo/jobs/client'
import { planSearch, writeAnswer } from '@/features/ask/gemini'
import { askRun } from '@/features/ask/inngest/event'
import type { SearchPlan } from '@/features/ask/schemas'
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
      await step.run('persist-empty-sources', async () =>
        persistTurn({
          threadId,
          turnId,
          answer: null,
          intent: null,
          plannedQueries: [],
          usedFallbackPlan: false,
          groups: [],
          totalMatches: 0,
          missingSources: sources.missing,
        }),
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

    const groups = await step.run('ripgrep', async () =>
      runLocalSearches(sources.available, plan.searches),
    )

    const totalMatches = totalMatchCount(groups)

    let answer: string | null = null
    if (totalMatches > 0) {
      try {
        answer = await step.ai.wrap('write-answer', writeAnswer, {
          question,
          history,
          evidence: groups,
        })
      } catch {
        answer = null
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
      error: message,
    },
  })

  await db.askThread.update({
    where: { id: turn.threadId },
    data: { updatedAt: new Date() },
  })
}
