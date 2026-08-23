import 'server-only'

import { redact } from '#redact'

export type LogFields = Record<string, unknown>

export type LogSink = {
  info: (message: string) => void
  warn: (message: string) => void
  error: (message: string) => void
}

export function logTo(
  sink: LogSink,
  level: keyof LogSink,
  event: string,
  fields?: LogFields,
): void {
  sink[level](JSON.stringify({ event, ...redact(fields ?? {}) }))
}

export function createLogger(service: string) {
  const emit = (level: keyof LogSink, event: string, fields?: LogFields) => {
    console[level](
      JSON.stringify({
        service,
        level,
        event,
        ...redact(fields ?? {}),
      }),
    )
  }

  return {
    info: (event: string, fields?: LogFields) => emit('info', event, fields),
    warn: (event: string, fields?: LogFields) => emit('warn', event, fields),
    error: (event: string, fields?: LogFields) => emit('error', event, fields),
  }
}
