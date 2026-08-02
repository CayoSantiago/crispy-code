import os from 'node:os'
import path from 'node:path'

export const FIND_HOME = path.join(os.homedir(), '.crispy-code')
export const FIND_CONFIG_PATH = path.join(FIND_HOME, 'config.json')
export const FIND_MIRROR_ROOT = path.join(FIND_HOME, 'repos')
