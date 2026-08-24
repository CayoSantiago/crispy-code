import 'server-only'

import { AskSearchStage, AskTurnStatus, db } from '@repo/db'
import { env } from '@repo/env/server'
import { inngest } from '@repo/jobs/client'
import { z } from 'zod'
import { isGeminiConfigured } from '@/features/ask/gemini'
import { askRun } from '@/features/ask/inngest/event'
import { askTurnChannel } from '@/features/ask/realtime'
import {
  type AskHistoryTurn,
  type AskTurn,
  askRealtimeTokenInputSchema,
  askStartInputSchema,
  askStartOutputSchema,
  askStatusOutputSchema,
  askThreadSchema,
  askThreadSummarySchema,
  askTurnSchema,
  plannedSearchSchema,
} from '@/features/ask/schemas'
import { threadTitleFromQuestion } from '@/features/ask/title'
import { searchGroupSchema } from '@/features/find/schemas'
import { base } from '@/lib/orpc/base'

const HISTORY_LIMIT = 6

export const askRouter = {
  status: base.output(askStatusOutputSchema).handler(async () => ({
    geminiConfigured: isGeminiConfigured(),
  })),
  start: base
    .input(askStartInputSchema)
    .output(askStartOutputSchema)
    .handler(async ({ context, input, errors }) => {
      const user = context.user
      if (!user) {
        throw errors.FORBIDDEN({
          message: 'Sign in to ask about your local code.',
        })
      }

      if (!env.GEMINI_API_KEY) {
        throw errors.BAD_REQUEST({
          message: 'Set GEMINI_API_KEY in apps/web/.env.local to enable Ask.',
        })
      }

      let threadId = input.threadId
      let history: AskHistoryTurn[] = []

      if (threadId) {
        const thread = await db.askThread.findFirst({
          where: { id: threadId, userId: user.id },
          include: { turns: { orderBy: { createdAt: 'asc' } } },
        })

        if (!thread) {
          throw errors.NOT_FOUND({ message: 'Chat not found.' })
        }

        if (
          thread.turns.some((turn) => turn.status === AskTurnStatus.RUNNING)
        ) {
          throw errors.BAD_REQUEST({
            message: 'Wait for the current answer before asking again.',
          })
        }

        history = thread.turns
          .filter(
            (turn) => turn.status === AskTurnStatus.COMPLETED && turn.answer,
          )
          .slice(-HISTORY_LIMIT)
          .map((turn) => ({
            question: turn.question,
            answer: turn.answer ?? '',
          }))
      } else {
        const created = await db.askThread.create({
          data: {
            userId: user.id,
            title: threadTitleFromQuestion(input.question),
          },
        })
        threadId = created.id
      }

      const turn = await db.askTurn.create({
        data: {
          threadId,
          question: input.question,
          status: AskTurnStatus.RUNNING,
          searchStage: AskSearchStage.PLANNING,
        },
      })

      try {
        const sent = await inngest.send(
          askRun.create({
            threadId,
            turnId: turn.id,
            question: input.question,
            history,
          }),
        )

        await db.askTurn.update({
          where: { id: turn.id },
          data: { inngestEventId: sent.ids[0] ?? null },
        })
      } catch (error) {
        await db.askTurn.update({
          where: { id: turn.id },
          data: {
            status: AskTurnStatus.FAILED,
            error:
              error instanceof Error
                ? error.message
                : 'Could not start the Ask workflow.',
          },
        })
        throw errors.INTERNAL_SERVER_ERROR({
          message: 'Could not start the Ask workflow.',
        })
      }

      return { threadId, turnId: turn.id }
    }),
  getThread: base
    .input(z.object({ threadId: z.string().min(1) }))
    .output(askThreadSchema)
    .handler(async ({ context, input, errors }) => {
      if (!context.user) {
        throw errors.FORBIDDEN({
          message: 'Sign in to ask about your local code.',
        })
      }
      const user = context.user
      const thread = await db.askThread.findFirst({
        where: { id: input.threadId, userId: user.id },
        include: { turns: { orderBy: { createdAt: 'asc' } } },
      })

      if (!thread) {
        throw errors.NOT_FOUND({ message: 'Chat not found.' })
      }

      return {
        id: thread.id,
        title: thread.title,
        createdAt: thread.createdAt.toISOString(),
        updatedAt: thread.updatedAt.toISOString(),
        turns: thread.turns.map(serializeTurn),
      }
    }),
  listThreads: base
    .output(z.array(askThreadSummarySchema))
    .handler(async ({ context, errors }) => {
      if (!context.user) {
        throw errors.FORBIDDEN({
          message: 'Sign in to ask about your local code.',
        })
      }
      const user = context.user
      const threads = await db.askThread.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
        take: 50,
        select: { id: true, title: true, updatedAt: true },
      })

      return threads.map((thread) => ({
        id: thread.id,
        title: thread.title,
        updatedAt: thread.updatedAt.toISOString(),
      }))
    }),
  deleteThread: base
    .input(z.object({ threadId: z.string().min(1) }))
    .output(z.object({ ok: z.literal(true) }))
    .handler(async ({ context, input, errors }) => {
      if (!context.user) {
        throw errors.FORBIDDEN({
          message: 'Sign in to ask about your local code.',
        })
      }
      const user = context.user
      const result = await db.askThread.deleteMany({
        where: { id: input.threadId, userId: user.id },
      })

      if (result.count === 0) {
        throw errors.NOT_FOUND({ message: 'Chat not found.' })
      }

      return { ok: true as const }
    }),
  realtimeToken: base
    .input(askRealtimeTokenInputSchema)
    .handler(async ({ context, input, errors }) => {
      if (!context.user) {
        throw errors.FORBIDDEN({
          message: 'Sign in to ask about your local code.',
        })
      }

      const turn = await db.askTurn.findFirst({
        where: {
          id: input.turnId,
          thread: { id: input.threadId, userId: context.user.id },
        },
        select: { id: true },
      })

      if (!turn) {
        throw errors.NOT_FOUND({ message: 'Chat not found.' })
      }

      return inngest.realtime.token({
        channel: askTurnChannel({ turnId: turn.id }),
        topics: ['tokens'],
      })
    }),
}

function serializeTurn(turn: {
  id: string
  question: string
  answer: string | null
  intent: string | null
  plannedQueries: unknown
  usedFallbackPlan: boolean
  groups: unknown
  totalMatches: number | null
  missingSources: unknown
  searchStage: AskSearchStage | null
  status: AskTurnStatus
  error: string | null
  createdAt: Date
}): AskTurn {
  const intent =
    turn.intent === 'component' || turn.intent === 'solution'
      ? turn.intent
      : null

  const completed = turn.status === AskTurnStatus.COMPLETED

  return askTurnSchema.parse({
    id: turn.id,
    question: turn.question,
    answer: turn.answer,
    intent,
    plannedQueries: plannedSearchSchema
      .array()
      .catch([])
      .parse(turn.plannedQueries),
    usedFallbackPlan: turn.usedFallbackPlan,
    groups: completed
      ? searchGroupSchema.array().catch([]).parse(turn.groups)
      : [],
    totalMatches: completed ? (turn.totalMatches ?? 0) : 0,
    missingSources: completed
      ? z
          .array(z.object({ id: z.string(), label: z.string() }))
          .catch([])
          .parse(turn.missingSources)
      : [],
    searchStage:
      turn.status === AskTurnStatus.RUNNING
        ? (turn.searchStage ?? 'PLANNING')
        : null,
    status: turn.status,
    error: turn.error,
    createdAt: turn.createdAt.toISOString(),
  })
}
