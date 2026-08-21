import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createHighlightedCodeBlockProps } from '@tanstack/highlight/react'
import type { Metadata } from 'next'
import Image from 'next/image'
import img from '@/assets/crispy-sites-hero.png'
import { Browser } from '@/components/browser'
import { ComponentPreview } from '@/components/component-preview'
import { highlighter } from '@/lib/highlighter'

const pathName = join(process.cwd(), 'components', 'browser.tsx')
const code = readFileSync(pathName, 'utf-8')

const props = createHighlightedCodeBlockProps({
  highlighter,
  code,
  lang: 'tsx',
  lineNumbers: true,
})

export const metadata = {
  title: 'Browser',
  description: 'Visually display websites.',
} satisfies Metadata

export default function ComponentsCopyButtonPage() {
  return (
    <ComponentPreview
      id='browser'
      header={metadata.title}
      desc={metadata.description}
      {...props}
    >
      <Browser url='crispysites.com'>
        <Image src={img} alt='' className='object-cover w-full' />
      </Browser>
    </ComponentPreview>
  )
}
