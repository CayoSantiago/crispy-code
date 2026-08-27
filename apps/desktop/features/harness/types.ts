export type HarnessStage = 'PLANNING' | 'SEARCHING' | 'WRITING'

export type HarnessEvent =
  | { type: 'stage'; stage: HarnessStage }
  | { type: 'token'; kind: 'thinking' | 'answer'; text: string }
  | { type: 'done' }
  | { type: 'error'; message: string }
