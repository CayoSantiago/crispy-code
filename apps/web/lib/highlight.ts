import { createHighlighter } from '@tanstack/highlight/core'
import { apache } from '@tanstack/highlight/languages/apache'
import { css } from '@tanstack/highlight/languages/css'
import { diff } from '@tanstack/highlight/languages/diff'
import { dockerfile } from '@tanstack/highlight/languages/dockerfile'
import { ejs } from '@tanstack/highlight/languages/ejs'
import { env } from '@tanstack/highlight/languages/env'
import { html } from '@tanstack/highlight/languages/html'
import { http } from '@tanstack/highlight/languages/http'
import { js } from '@tanstack/highlight/languages/js'
import { json } from '@tanstack/highlight/languages/json'
import { jsx } from '@tanstack/highlight/languages/jsx'
import { markdown } from '@tanstack/highlight/languages/markdown'
import { mermaid } from '@tanstack/highlight/languages/mermaid'
import { nginx } from '@tanstack/highlight/languages/nginx'
import { plaintext } from '@tanstack/highlight/languages/plaintext'
import { python } from '@tanstack/highlight/languages/python'
import { scheme } from '@tanstack/highlight/languages/scheme'
import { shell } from '@tanstack/highlight/languages/shell'
import { sql } from '@tanstack/highlight/languages/sql'
import { svelte } from '@tanstack/highlight/languages/svelte'
import { toml } from '@tanstack/highlight/languages/toml'
import { ts } from '@tanstack/highlight/languages/ts'
import { tsx } from '@tanstack/highlight/languages/tsx'
import { vue } from '@tanstack/highlight/languages/vue'
import { yaml } from '@tanstack/highlight/languages/yaml'
import { createThemeCss } from '@tanstack/highlight/theme'
import { githubDarkTheme } from '@tanstack/highlight/themes/github-dark'
import { githubLightTheme } from '@tanstack/highlight/themes/github-light'

export const highlighter = createHighlighter({
  fallbackLanguage: 'plaintext',
  languages: [
    apache,
    css,
    diff,
    dockerfile,
    ejs,
    env,
    html,
    http,
    js,
    json,
    jsx,
    markdown,
    mermaid,
    nginx,
    plaintext,
    python,
    scheme,
    shell,
    sql,
    svelte,
    toml,
    ts,
    tsx,
    vue,
    yaml,
  ],
})

export const highlightCss = createThemeCss({
  light: githubLightTheme,
  dark: githubDarkTheme,
})
