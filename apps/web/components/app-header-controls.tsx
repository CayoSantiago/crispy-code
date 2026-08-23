'use client'

import { authClient } from '@repo/auth/client'
import { Badge } from '@repo/ui/components/badge'
import { Button } from '@repo/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu'
import { Skeleton } from '@repo/ui/components/skeleton'
import { LogInIcon, LogOutIcon, UserCircle2Icon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export function AppHeaderControls() {
  const router = useRouter()

  const { data, error, isPending } = authClient.useSession()

  const handleLogOut = () => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          console.log('Logged out')
          router.push('/login')
        },
      },
    })
  }

  if (isPending)
    return (
      <div>
        <Skeleton className='h-3 w-28' />
        <Skeleton className='h-2.5 w-40 mt-1' />
      </div>
    )

  if (error)
    return (
      <Badge variant='destructive' className='m-2'>
        <span className='size-1.25 bg-destructive/80 rounded-full' />
        <span>Error</span>
      </Badge>
    )

  const user = data?.user

  if (!user)
    return (
      <Button
        variant='ghost'
        size='lg'
        nativeButton={false}
        render={<Link href='/login' />}
      >
        <LogInIcon />
        <span>Login</span>
      </Button>
    )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant='ghost'
            size='lg'
            className='text-start h-11 block space-y-0.5'
          />
        }
      >
        <div className='leading-none text-sm font-medium'>{user.name}</div>
        <div className='leading-none text-xs font-normal text-muted-foreground'>
          {user.email}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <UserCircle2Icon />
            <span>Profile</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleLogOut}>
            <LogOutIcon />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
