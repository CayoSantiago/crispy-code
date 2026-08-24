import { createGoogle } from '@ai-sdk/google'
import { env } from '@repo/env/server'
import { generateText, Output, streamText } from 'ai'
import { fetch as inngestFetch } from 'inngest'
import type { z } from 'zod'
import type { AskHistoryTurn } from '@/features/ask/schemas'
import { type SearchPlan, searchPlanSchema } from '@/features/ask/schemas'
import type { SearchGroup } from '@/features/find/schemas'

const MODEL_ID = 'gemini-3.7-flash'

export function isGeminiConfigured(): boolean {
  return Boolean(env.GEMINI_API_KEY)
}

async function generateObject<T>(
  schema: z.ZodType<T>,
  prompt: string,
): Promise<T> {
  const apiKey = env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set.')
  }

  const google = createGoogle({ apiKey, fetch: inngestFetch })
  const { output } = await generateText({
    model: google(MODEL_ID),
    output: Output.object({ schema }),
    prompt,
    maxRetries: 0,
  })

  if (output == null) {
    throw new Error('Gemini returned no structured output.')
  }

  return output
}

export async function planSearch(input: {
  question: string
  history: AskHistoryTurn[]
}): Promise<SearchPlan> {
  const historyBlock = formatHistory(input.history)
  const prompt = `You plan ripgrep searches over a local codebase.

Return 1-3 focused searches. Prefer identifier-like terms, file names, and path globs for UI components. Use regex only when it clearly helps.
Intent "component" means the user wants to find a UI/component. Intent "solution" means they want to know how the codebase solves a problem.

${historyBlock}
Question:
${input.question}`

  return generateObject(searchPlanSchema, prompt)
}

export async function streamWriteAnswer(input: {
  question: string
  history: AskHistoryTurn[]
  evidence: SearchGroup[]
  onThinking?: (delta: string) => Promise<void> | void
  onAnswer?: (delta: string) => Promise<void> | void
}): Promise<string> {
  const apiKey = env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set.')
  }

  const google = createGoogle({ apiKey, fetch: inngestFetch })
  const result = streamText({
    model: google(MODEL_ID),
    prompt: answerPrompt(input.question, input.history, input.evidence),
    maxRetries: 0,
    providerOptions: {
      google: {
        thinkingConfig: {
          includeThoughts: true,
          thinkingLevel: 'minimal',
        },
      },
    },
  })

  let answer = ''

  for await (const part of result.fullStream) {
    if (part.type === 'reasoning-delta' && part.text) {
      await input.onThinking?.(part.text)
    }
    if (part.type === 'text-delta' && part.text) {
      answer += part.text
      await input.onAnswer?.(part.text)
    }
    if (part.type === 'error') {
      throw part.error instanceof Error
        ? part.error
        : new Error('Gemini stream failed.')
    }
  }

  return answer
}

function answerPrompt(
  question: string,
  history: AskHistoryTurn[],
  evidence: SearchGroup[],
): string {
  return `You answer questions using only the code evidence below. Write 2-5 short sentences of plain prose. Name files. Do not invent files that are not in the evidence. If the evidence is weak, say so.

${formatHistory(history)}
Question:
${question}

Evidence:
${formatEvidence(evidence)}`
}

function formatHistory(history: AskHistoryTurn[]): string {
  if (!history.length) {
    return 'Prior turns: none.'
  }

  const lines = history.map(
    (turn, index) => `${index + 1}. Q: ${turn.question}\n   A: ${turn.answer}`,
  )
  return `Prior turns:\n${lines.join('\n')}`
}

function formatEvidence(groups: SearchGroup[]): string {
  if (!groups.length) {
    return '(no matching code)'
  }

  const chunks: string[] = []

  for (const group of groups) {
    for (const file of group.files) {
      const lines = file.clusters
        .flatMap((cluster) => cluster.lines)
        .filter((line) => line.kind === 'match')
        .map((line) => `${line.lineNumber}: ${line.lineText}`)
        .join('\n')
      chunks.push(`${group.projectName} ${file.relativePath}\n${lines}`)
    }
  }

  return chunks.join('\n\n')
}
