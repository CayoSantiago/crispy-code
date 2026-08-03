import {
  _React,
  Css,
  DockerIcon,
  Eslint,
  GitIcon,
  Html5,
  type Icon,
  Java,
  Javascript,
  Markdown,
  NextjsIcon,
  NodejsIcon,
  Npm,
  Php,
  Pnpm,
  Postcss,
  Postgresql,
  Prettier,
  Prisma,
  Python,
  Rust,
  Svg,
  Toml,
  TurborepoIcon,
  TypescriptIcon,
} from '@dev.icons/react'
import { Badge } from '@repo/ui/components/badge'
import { languageForFilename } from '@/features/diff/language-for-filename'
import { getFilenameFromPath } from '@/lib/file'

const LANG_ICON: Record<string, Icon> = {
  jsx: _React,
  tsx: _React,
  ts: TypescriptIcon,
  js: Javascript,
  markdown: Markdown,
  java: Java,
  php: Php,
  python: Python,
  rs: Rust,
  css: Css,
  html: Html5,
  sql: Postgresql,
}

const FILE_ICON = {
  pnpm: {
    regex: /^pnpm-.*\.ya?ml$/g,
    icon: Pnpm,
  },
  docker: {
    regex: /dockerfile|compose.*\.ya?ml$/g,
    icon: DockerIcon,
  },
  git: {
    regex: /^\.git/g,
    icon: GitIcon,
  },
  next: {
    regex: /^next\.config\./g,
    icon: NextjsIcon,
  },
  node: {
    regex: /^package\.json$/g,
    icon: NodejsIcon,
  },
  npm: {
    regex: /^\.npm/g,
    icon: Npm,
  },
  prisma: {
    regex: /\.prisma$|^prisma.config\./g,
    icon: Prisma,
  },
  eslint: {
    regex: /^eslint\.config\.|^\.eslint/g,
    icon: Eslint,
  },
  prettier: {
    regex: /^\.prettier/g,
    icon: Prettier,
  },
  svg: {
    regex: /\.svg$/g,
    icon: Svg,
  },
  toml: {
    regex: /\.toml$/g,
    icon: Toml,
  },
  postcss: {
    regex: /^\.?postcss/g,
    icon: Postcss,
  },
  turborepo: {
    regex: /turbo\.json$/g,
    icon: TurborepoIcon,
  },
}

export function FileIcon({ filePath }: { filePath: string }) {
  const filename = getFilenameFromPath(filePath)
  const lang = languageForFilename(filePath)

  const Icon =
    Object.values(FILE_ICON).find(({ regex }) => regex.test(filename))?.icon ??
    LANG_ICON[lang] ??
    null

  if (Icon === null) {
    return (
      <Badge
        variant='outline'
        className='rounded-xs font-mono text-muted-foreground'
      >
        {lang}
      </Badge>
    )
  }

  return <Icon key={filePath} className='size-3.5 rounded-xs shrink-0' />
}
