import { createHighlighter } from '@tanstack/highlight/core'
import { css } from '@tanstack/highlight/languages/css'
import { diff } from '@tanstack/highlight/languages/diff'
import { dockerfile } from '@tanstack/highlight/languages/dockerfile'
import { env } from '@tanstack/highlight/languages/env'
import { html } from '@tanstack/highlight/languages/html'
import { js } from '@tanstack/highlight/languages/js'
import { json } from '@tanstack/highlight/languages/json'
import { jsx } from '@tanstack/highlight/languages/jsx'
import { markdown } from '@tanstack/highlight/languages/markdown'
import { plaintext } from '@tanstack/highlight/languages/plaintext'
import { shell } from '@tanstack/highlight/languages/shell'
import { sql } from '@tanstack/highlight/languages/sql'
import { toml } from '@tanstack/highlight/languages/toml'
import { ts } from '@tanstack/highlight/languages/ts'
import { tsx } from '@tanstack/highlight/languages/tsx'
import { yaml } from '@tanstack/highlight/languages/yaml'

export const highlighter = createHighlighter({
  fallbackLanguage: 'plaintext',
  languages: [
    css,
    diff,
    dockerfile,
    env,
    html,
    js,
    json,
    jsx,
    markdown,
    plaintext,
    shell,
    sql,
    toml,
    ts,
    tsx,
    yaml,
  ],
})
