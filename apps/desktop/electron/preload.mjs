import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('crispyDesktop', {
  platform: process.platform,
})
