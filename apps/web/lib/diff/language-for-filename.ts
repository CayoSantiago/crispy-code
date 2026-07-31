const BY_EXTENSION: Record<string, string> = {
  bash: 'shell',
  cjs: 'js',
  css: 'css',
  diff: 'diff',
  ejs: 'ejs',
  htm: 'html',
  html: 'html',
  http: 'http',
  js: 'js',
  json: 'json',
  json5: 'json',
  jsonc: 'json',
  jsx: 'jsx',
  markdown: 'markdown',
  md: 'markdown',
  mdx: 'markdown',
  mermaid: 'mermaid',
  mjs: 'js',
  mts: 'ts',
  patch: 'diff',
  py: 'python',
  rkt: 'scheme',
  scm: 'scheme',
  sh: 'shell',
  sql: 'sql',
  svelte: 'svelte',
  toml: 'toml',
  ts: 'ts',
  tsx: 'tsx',
  vue: 'vue',
  xml: 'html',
  yaml: 'yaml',
  yml: 'yaml',
  zsh: 'shell',
}

const BY_FILENAME: Record<string, string> = {
  dockerfile: 'dockerfile',
  'nginx.conf': 'nginx',
}

/**
 * Resolves a repository file path to a language registered on the highlighter.
 * Anything unrecognised falls back to plain text, which still renders correctly.
 */
export function languageForFilename(path: string): string {
  const filename = path.split('/').pop()?.toLowerCase() ?? ''

  const byFilename = BY_FILENAME[filename]
  if (byFilename) {
    return byFilename
  }

  // Covers .env, .env.local, .env.production and friends.
  if (filename.startsWith('.env')) {
    return 'env'
  }

  const dot = filename.lastIndexOf('.')

  // A leading dot means a dotfile such as .gitignore, not an extension.
  if (dot <= 0) {
    return 'plaintext'
  }

  return BY_EXTENSION[filename.slice(dot + 1)] ?? 'plaintext'
}
