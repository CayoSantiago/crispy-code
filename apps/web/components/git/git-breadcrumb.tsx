'use client'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@repo/ui/components/breadcrumb'
import type { Route } from 'next'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Fragment } from 'react'

export function GitBreadcrumb() {
  const pathname = usePathname()
  // Drop the leading 'git' segment; what remains is [owner, repo, 'commit', sha].
  const [owner, repo, kind, sha] = pathname.split('/').filter(Boolean).slice(1)

  const crumbs: Array<{ href: Route; label: string }> = []

  if (owner && repo) {
    crumbs.push({
      href: `/git/${owner}/${repo}` as Route,
      label: `${owner}/${repo}`,
    })

    if (kind === 'commit' && sha) {
      crumbs.push({
        href: `/git/${owner}/${repo}/commit/${sha}` as Route,
        label: sha.slice(0, 7),
      })
    }
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          {crumbs.length === 0 ? (
            <BreadcrumbPage>Git</BreadcrumbPage>
          ) : (
            <BreadcrumbLink render={<Link href='/git' />}>Git</BreadcrumbLink>
          )}
        </BreadcrumbItem>

        {crumbs.map((crumb, index) => (
          <Fragment key={crumb.href}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {index === crumbs.length - 1 ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink render={<Link href={crumb.href} />}>
                  {crumb.label}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
