export function threadTitleFromQuestion(question: string): string {
  const compact = question.trim().replace(/\s+/g, ' ')
  if (compact.length <= 80) {
    return compact
  }

  return `${compact.slice(0, 79).trimEnd()}…`
}
