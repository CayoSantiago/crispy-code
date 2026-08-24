import { createGoogle } from '@ai-sdk/google'
import { env } from '@repo/env/server'
import { generateText, Output } from 'ai'
import { fetch as inngestFetch } from 'inngest'
import type { z } from 'zod'
import type { AskHistoryTurn } from '@/features/ask/schemas'
import {
  answerSchema,
  type SearchPlan,
  searchPlanSchema,
} from '@/features/ask/schemas'
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

export async function writeAnswer(input: {
  question: string
  history: AskHistoryTurn[]
  evidence: SearchGroup[]
}): Promise<string> {
  const historyBlock = formatHistory(input.history)
  const evidenceBlock = formatEvidence(input.evidence)
  const prompt = `You answer questions using only the code evidence below. Write 2-5 short sentences of plain prose. Name files. Do not invent files that are not in the evidence. If the evidence is weak, say so.

${historyBlock}
Question:
${input.question}

Evidence:
${evidenceBlock}`

  const { answer } = await generateObject(answerSchema, prompt)
  return answer
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
