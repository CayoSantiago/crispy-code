import { Button } from '@repo/ui/components/button'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
import { AppHeaderControls } from '@/components/app-header-controls'
import { AskStatusNotifications } from '@/features/ask/components/ask-status-notifications'
import { ChatHistory } from '@/features/ask/components/chat-history'

export default function AskLayout({ children }: LayoutProps<'/ask'>) {
  return (
    <SidebarProvider>
      <ChatSidebar />

      <main className='grid min-h-svh w-full grid-cols-1 grid-rows-[auto_minmax(0,1fr)] gap-2 bg-muted/50 p-6 pt-0 dark:bg-background'>
        <div className='flex items-center gap-2 p-1 pr-2.5 self-start -mx-6 h-8'>
          <SidebarTrigger />

          <Suspense>
            <AskStatusNotifications />
          </Suspense>

          <Link
            href='/find'
            className='text-xs text-muted-foreground hover:text-foreground ml-auto'
          >
            Folders on Code Finder
          </Link>
        </div>

        <div className='mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col'>
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}

function ChatSidebar() {
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
              <span>New chat</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <span>History</span>
            <HistoryIcon className='size-3! stroke-[1.6] ml-auto text-muted-foreground' />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <Suspense fallback={<Spinner />}>
                <ChatHistory />
              </Suspense>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <AppHeaderControls />
      </SidebarFooter>
    </Sidebar>
  )
}
