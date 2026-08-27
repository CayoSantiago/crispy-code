import 'server-only'

import { z } from 'zod/v4'
import { isGeminiConfigured } from '@/features/ask/gemini'
import {
  type AskHistoryTurn,
  type AskTurn,
  askRenameThreadInputSchema,
  askRenameThreadOutputSchema,
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
import { runAskTurn } from '@/features/harness/runner'
import { env } from '@/lib/env'
import {
  createThread,
  deleteThread,
  getThread,
  listThreads,
  renameThread,
} from '@/lib/harness-db/threads'
import {
  createTurn,
  type TurnRow,
  threadHasRunningTurn,
} from '@/lib/harness-db/turns'
import { base } from '@/lib/orpc/base'

const HISTORY_LIMIT = 6

export const askRouter = {
  status: base.output(askStatusOutputSchema).handler(async () => ({
    geminiConfigured: isGeminiConfigured(),
  })),
  start: base
    .input(askStartInputSchema)
    .output(askStartOutputSchema)
    .handler(async ({ input, errors }) => {
      if (!env.GEMINI_API_KEY) {
        throw errors.BAD_REQUEST({
          message:
            'Set GEMINI_API_KEY in apps/desktop/.env.local to enable Ask.',
        })
      }

      let threadId = input.threadId
      let history: AskHistoryTurn[] = []

      if (threadId) {
        const thread = getThread(threadId)
        if (!thread) {
          throw errors.NOT_FOUND({ message: 'Ask thread not found.' })
        }

        if (threadHasRunningTurn(threadId)) {
          throw errors.BAD_REQUEST({
            message: 'Wait for the current answer before asking again.',
          })
        }

        history = thread.turns
          .filter(
            (
              turn,
            ): turn is TurnRow & {
              answer: string
            } => turn.status === 'COMPLETED' && Boolean(turn.answer),
          )
          .slice(-HISTORY_LIMIT)
          .map((turn) => ({
            question: turn.question,
            answer: turn.answer,
          }))
      } else {
        threadId = createThread({
          title: threadTitleFromQuestion(input.question),
        }).id
      }

      const turn = createTurn({
        threadId,
        question: input.question,
      })

      void runAskTurn({
        threadId,
        turnId: turn.id,
        question: input.question,
        history,
      })

      return { threadId, turnId: turn.id }
    }),
  getThread: base
    .input(z.object({ threadId: z.string().min(1) }))
    .output(askThreadSchema)
    .handler(async ({ input, errors }) => {
      const thread = getThread(input.threadId)
      if (!thread) {
        throw errors.NOT_FOUND({ message: 'Ask thread not found.' })
      }

      return {
        id: thread.id,
        title: thread.title,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
        turns: thread.turns.map(serializeTurn),
      }
    }),
  listThreads: base.output(z.array(askThreadSummarySchema)).handler(async () =>
    listThreads()
      .slice(0, 50)
      .map((thread) => ({
        id: thread.id,
        title: thread.title,
        updatedAt: thread.updatedAt,
      })),
  ),
  deleteThread: base
    .input(z.object({ threadId: z.string().min(1) }))
    .output(z.object({ ok: z.literal(true) }))
    .handler(async ({ input, errors }) => {
      if (!deleteThread(input.threadId)) {
        throw errors.NOT_FOUND({ message: 'Ask thread not found.' })
      }

      return { ok: true as const }
    }),
  renameThread: base
    .input(askRenameThreadInputSchema)
    .output(askRenameThreadOutputSchema)
    .handler(async ({ input, errors }) => {
      if (!renameThread(input.threadId, input.title)) {
        throw errors.NOT_FOUND({ message: 'Ask thread not found.' })
      }

      return { ok: true as const }
    }),
}

function serializeTurn(turn: TurnRow): AskTurn {
  const intent =
    turn.intent === 'component' || turn.intent === 'solution'
      ? turn.intent
      : null
  const completed = turn.status === 'COMPLETED'

  return askTurnSchema.parse({
    id: turn.id,
    question: turn.question,
    answer: turn.answer,
    intent,
    plannedQueries: plannedSearchSchema
      .array()
      .catch([])
      .parse(turn.plannedQueries),
    usedFallbackPlan: turn.usedFallbackPlan === 1,
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
      turn.status === 'RUNNING' ? (turn.searchStage ?? 'PLANNING') : null,
    status: turn.status,
    error: turn.error,
    createdAt: turn.createdAt,
  })
}
