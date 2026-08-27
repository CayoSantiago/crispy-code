export function reconcileTurnAnswer(stored: string, streamed: string): string {
  if (!stored || streamed.startsWith(stored)) {
    return streamed
  }
  if (!streamed || stored.startsWith(streamed)) {
    return stored
  }

  return stored
}
