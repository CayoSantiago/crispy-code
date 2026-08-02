import {
  access,
  constants,
  mkdir,
  readdir,
  readFile,
  rm,
  rmdir,
  stat,
} from 'node:fs/promises'
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

export async function isReadableDir(dir: string): Promise<boolean> {
  try {
    await access(dir, constants.R_OK)
    return true
  } catch {
    return false
  }
}

export function normalizeLocalPath(raw: string): string {
  if (raw.startsWith('~/')) {
    return path.join(os.homedir(), raw.slice(2))
  }

  return raw
}

/**
 * Resolve `root/segments...` and return the absolute path only if it stays
 * strictly inside `root` (not equal to root). Returns null on escape / empty.
 */
export function resolveUnderRoot(
  root: string,
  ...segments: string[]
): string | null {
  if (segments.some((segment) => segment.length === 0)) {
    return null
  }

  const resolvedRoot = path.resolve(root)
  const resolved = path.resolve(resolvedRoot, ...segments)
  const prefix = resolvedRoot.endsWith(path.sep)
    ? resolvedRoot
    : `${resolvedRoot}${path.sep}`

  if (resolved === resolvedRoot || !resolved.startsWith(prefix)) {
    return null
  }

  return resolved
}

export async function removePathIfExists(target: string): Promise<void> {
  await rm(target, { recursive: true, force: true })
}

export async function removeDirIfEmpty(dir: string): Promise<void> {
  try {
    const entries = await readdir(dir)
    if (entries.length === 0) {
      await rmdir(dir)
    }
  } catch {
    // best-effort
  }
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
