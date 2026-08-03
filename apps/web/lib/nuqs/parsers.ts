import { createParser } from 'nuqs/server'

export const stringParser = createParser({
  parse: decodeURIComponent,
  serialize: encodeURIComponent,
})
