import { Button } from '@repo/ui/components/button'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@repo/ui/components/sidebar'
import { Spinner } from '@repo/ui/components/spinner'
import { HistoryIcon, PlusIcon } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'
import { AskHistory } from '@/features/ask/components/ask-history'
import { AskStatusNotifications } from '@/features/ask/components/ask-status-notifications'

export default function AskLayout({ children }: LayoutProps<'/ask'>) {
  return (
    <SidebarProvider>
      <AskSidebar />

      <main className='grid h-svh w-full grid-cols-1 grid-rows-[auto_minmax(0,1fr)] gap-2 bg-muted/50 p-4 pt-0 dark:bg-background'>
        <div className='-mx-4 flex h-8 items-center gap-2 self-start p-1 pr-2.5'>
          <SidebarTrigger />
          <Suspense>
            <AskStatusNotifications />
          </Suspense>
          <Link
            href='/find'
            className='ml-auto text-muted-foreground text-xs hover:text-foreground'
          >
            Folders on Code Finder
          </Link>
        </div>

        {children}
      </main>
    </SidebarProvider>
  )
}

function AskSidebar() {
  return (
    <Sidebar variant='sidebar'>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <Button
              variant='outline'
              nativeButton={false}
              render={<SidebarMenuButton render={<Link href='/ask' />} />}
            >
              <PlusIcon />
              <span>New Ask thread</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <span>History</span>
            <HistoryIcon className='ml-auto size-3! stroke-[1.6] text-muted-foreground' />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <Suspense fallback={<Spinner />}>
                <AskHistory />
              </Suspense>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
