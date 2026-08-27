import { contextBridge } from 'electron'

const tokenArgument = process.argv.find((argument) =>
  argument.startsWith('--desktop-rpc-token='),
)
const desktopToken = tokenArgument?.slice('--desktop-rpc-token='.length)
if (!desktopToken) {
  throw new Error('Missing desktop RPC token.')
}

contextBridge.exposeInMainWorld('crispyDesktop', {
  desktopToken,
  platform: process.platform,
})
