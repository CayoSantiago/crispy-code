import { Button } from '@repo/ui/components/button'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from '@repo/ui/components/navigation-menu'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@repo/ui/components/sheet'
import { Menu } from 'lucide-react'
import Link from 'next/link'
import { ROOT_NAV } from '@/data/routes'
import { AppHeaderControls } from './app-header-controls'

export function AppHeader() {
  return (
    <header className='fixed top-0 left-0 w-full h-16 bg-card/40 dark:bg-card/80 backdrop-blur-md flex items-center justify-between pr-3 md:pr-6 md:pl-3 shadow z-50'>
      <AppHeaderControls />

      {/* ----- Mobile Nav ----- */}

      <Sheet>
        <SheetTrigger
          render={<Button variant='ghost' size='icon' className='lg:hidden' />}
        >
          <Menu className='size-6' />
          <span className='sr-only'>Toggle navigation menu</span>
        </SheetTrigger>

        <SheetContent className='flex flex-col p-6'>
          <SheetHeader>
            <SheetTitle className='flex justify-center'>
              {/* <Logo /> */}
            </SheetTitle>
          </SheetHeader>

          <nav className='flex flex-col gap-4 flex-grow'>
            {ROOT_NAV.map(({ title, href }) => (
              <SheetClose
                key={`mobile-nav-menu-item-[${title}]`}
                nativeButton={false}
                render={
                  <Button
                    variant='ghost'
                    size='lg'
                    nativeButton={false}
                    render={<Link href={href} />}
                  />
                }
              >
                {title}
              </SheetClose>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      {/* ----- Desktop Nav ----- */}

      <NavigationMenu className='hidden lg:flex'>
        <NavigationMenuList className='gap-1'>
          {ROOT_NAV.map(({ title, href }) => (
            <NavigationMenuItem key={`nav-menu-item-[${title}]`}>
              <Link href={href} className='py-2 px-4 text-sm font-medium'>
                {title}
              </Link>
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>
    </header>
  )
}
