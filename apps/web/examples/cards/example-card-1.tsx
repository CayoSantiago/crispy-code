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

export function ExampleCard1() {
  return (
    <Card variant='glowing'>
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
        <Button popoverTarget='testing-dialog' className='ml-auto'>
          Testing
        </Button>
      </CardFooter>
    </Card>
  )
}
