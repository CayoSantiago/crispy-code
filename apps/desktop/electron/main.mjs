import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { app, BrowserWindow } from 'electron'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEV_URL = process.env.DESKTOP_URL ?? 'http://127.0.0.1:3002'
const configuredToken = process.env.DESKTOP_RPC_TOKEN?.trim()
const desktopRpcToken =
  configuredToken && configuredToken.length >= 32
    ? configuredToken
    : randomUUID()
process.env.DESKTOP_RPC_TOKEN = desktopRpcToken

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      additionalArguments: [`--desktop-rpc-token=${desktopRpcToken}`],
    },
  })
  await win.webContents.session.cookies.set({
    url: DEV_URL,
    name: 'desktop-rpc-token',
    value: desktopRpcToken,
    httpOnly: true,
    secure: new URL(DEV_URL).protocol === 'https:',
    sameSite: 'strict',
    path: '/',
  })
  await win.loadURL(DEV_URL)
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
