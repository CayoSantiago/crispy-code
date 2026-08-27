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
import { getFilenameFromPath } from '@/lib/file'
import { languageForFilename } from '@/lib/highlighter/helpers'

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

const FILE_ICON = [
  { regex: /^pnpm-.*\.ya?ml$/, icon: Pnpm },
  { regex: /dockerfile|compose.*\.ya?ml$/, icon: DockerIcon },
  { regex: /^\.git/, icon: GitIcon },
  { regex: /^next\.config\./, icon: NextjsIcon },
  { regex: /^package\.json$/, icon: NodejsIcon },
  { regex: /^\.npm/, icon: Npm },
  { regex: /\.prisma$|^prisma.config\./, icon: Prisma },
  { regex: /^eslint\.config\.|^\.eslint/, icon: Eslint },
  { regex: /^\.prettier/, icon: Prettier },
  { regex: /\.svg$/, icon: Svg },
  { regex: /\.toml$/, icon: Toml },
  { regex: /^\.?postcss/, icon: Postcss },
  { regex: /turbo\.json$/, icon: TurborepoIcon },
]

export function FileIcon({ filePath }: { filePath: string }) {
  const filename = getFilenameFromPath(filePath)
  const lang = languageForFilename(filePath)
  const Icon =
    FILE_ICON.find(({ regex }) => regex.test(filename))?.icon ??
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
