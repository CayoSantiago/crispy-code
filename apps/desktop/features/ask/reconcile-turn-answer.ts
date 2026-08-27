export function reconcileTurnAnswer(stored: string, streamed: string): string {
  return streamed.length >= stored.length ? streamed : stored
}
