import { Button } from '@repo/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@repo/ui/components/empty'
import { ImageIcon } from 'lucide-react'

export default function Page() {
  return (
    <main className='min-h-svh p-6 pt-20 w-full grid justify-items-center'>
      <div className='grid max-w-md min-w-0 w-full gap-12 auto-rows-max items-start'>
        <Card variant='glowing-lg'>
          <CardHeader>
            <CardTitle>Coming Soon!</CardTitle>
            <CardDescription>
              This is and example card with glowing animated borders.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Empty className='border'>
              <EmptyHeader>
                <EmptyMedia variant='icon'>
                  <ImageIcon />
                </EmptyMedia>
                <EmptyTitle>Content Here</EmptyTitle>
                <EmptyDescription>Media content goes here...</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
          <CardFooter variant='muted'>
            <Button className='ml-auto'>Testing</Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}
