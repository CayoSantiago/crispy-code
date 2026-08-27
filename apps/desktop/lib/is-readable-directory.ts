import { access, constants, stat } from 'node:fs/promises'

export async function isReadableDirectory(dir: string): Promise<boolean> {
  try {
    const entry = await stat(dir)
    if (!entry.isDirectory()) return false

    await access(dir, constants.R_OK)
    return true
  } catch {
    return false
  }
}
