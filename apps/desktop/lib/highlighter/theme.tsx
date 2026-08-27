import { createThemeCss } from '@tanstack/highlight/theme'
import { githubDarkTheme } from '@tanstack/highlight/themes/github-dark'
import { githubLightTheme } from '@tanstack/highlight/themes/github-light'

const highlightCss = createThemeCss({
  light: githubLightTheme,
  dark: githubDarkTheme,
})

export function HighlighterStyles() {
  return <style dangerouslySetInnerHTML={{ __html: highlightCss }} />
}
