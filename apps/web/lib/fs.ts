import { mkdir, readFile, stat } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type z from 'zod'
import { formatIssues } from '@/lib/validation'

export async function pathExists(inputPath: string): Promise<boolean> {
  try {
    await stat(inputPath)
    return true
  } catch {
    return false
  }
}

export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true })
}

export function normalizeLocalPath(raw: string): string {
  if (raw.startsWith('~/')) {
    return path.join(os.homedir(), raw.slice(2))
  }

  return raw
}

export async function getParsedJsonFileData<T>(options: {
  path: string
  schema: z.ZodType<T>
  defaultValue: NoInfer<T>
}): Promise<T> {
  let raw: string

  try {
    raw = await readFile(options.path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return options.defaultValue
    }

    throw error
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  } catch {
    console.warn(
      `Ignoring unparseable file at ${options.path}; using defaults.`,
    )
    return options.defaultValue
  }

  const result = options.schema.safeParse(parsed)

  if (!result.success) {
    console.warn(
      `Ignoring invalid file at ${options.path}: ${formatIssues(result.error)}`,
    )
    return options.defaultValue
  }

  return result.data
}
