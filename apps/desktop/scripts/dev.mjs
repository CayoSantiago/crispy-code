import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import electron from 'electron'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const HOST = '127.0.0.1'
const PORT = 3002
const URL = `http://${HOST}:${PORT}`
const configuredToken = process.env.DESKTOP_RPC_TOKEN?.trim()
const desktopRpcToken =
  configuredToken && configuredToken.length >= 32
    ? configuredToken
    : randomUUID()
process.env.DESKTOP_RPC_TOKEN = desktopRpcToken

function waitForServer(maxAttempts = 120, intervalMs = 500) {
  return new Promise((resolve, reject) => {
    let attempts = 0

    const check = () => {
      attempts += 1
      const request = http.get(URL, (response) => {
        response.resume()
        resolve()
      })

      request.on('error', () => {
        if (attempts >= maxAttempts) {
          reject(new Error(`Next dev server did not start at ${URL}`))
          return
        }

        setTimeout(check, intervalMs)
      })
    }

    check()
  })
}

function killProcess(child) {
  if (!child.killed) {
    child.kill('SIGTERM')
  }
}

const next = spawn('pnpm', ['run', 'dev:next'], {
  cwd: ROOT,
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    DESKTOP_RPC_TOKEN: desktopRpcToken,
    ELECTRON_DISABLE_SECURITY_WARNINGS: '1',
  },
})

next.on('error', (error) => {
  console.error('Failed to start Next dev server:', error)
  process.exit(1)
})

try {
  await waitForServer()
} catch (error) {
  killProcess(next)
  console.error(error)
  process.exit(1)
}

const electronMain = path.join(ROOT, 'electron', 'main.mjs')
const electronProcess = spawn(electron, [electronMain], {
  cwd: ROOT,
  stdio: 'inherit',
  env: {
    ...process.env,
    DESKTOP_RPC_TOKEN: desktopRpcToken,
    ELECTRON_DISABLE_SECURITY_WARNINGS: '1',
  },
})

electronProcess.on('error', (error) => {
  killProcess(next)
  console.error('Failed to start Electron:', error)
  process.exit(1)
})

electronProcess.on('exit', (code) => {
  killProcess(next)
  process.exit(code ?? 0)
})

process.on('SIGINT', () => {
  killProcess(electronProcess)
  killProcess(next)
  process.exit(0)
})

process.on('SIGTERM', () => {
  killProcess(electronProcess)
  killProcess(next)
  process.exit(0)
})
