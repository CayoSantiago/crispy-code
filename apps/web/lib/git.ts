import { spawn } from 'node:child_process'

export async function runGit(
  args: string[],
  cwd?: string,
): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const child = spawn('git', args, { cwd })
    let stderr = ''

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    })

    child.on('error', (error) => {
      resolve({ ok: false, error: error.message })
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ ok: true })
        return
      }

      resolve({
        ok: false,
        error: stderr.trim() || `git exited with code ${code}`,
      })
    })
  })
}
