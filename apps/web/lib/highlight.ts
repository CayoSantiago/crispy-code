import { createHighlighter } from '@tanstack/highlight/core'
import { css } from '@tanstack/highlight/languages/css'
import { html } from '@tanstack/highlight/languages/html'
import { tsx } from '@tanstack/highlight/languages/tsx'
import { createThemeCss } from '@tanstack/highlight/theme'
import { githubDarkTheme } from '@tanstack/highlight/themes/github-dark'
import { githubLightTheme } from '@tanstack/highlight/themes/github-light'

export const highlighter = createHighlighter({
  languages: [html, css, tsx],
})

export const highlightCss = createThemeCss({
  light: githubLightTheme,
  dark: githubDarkTheme,
})
