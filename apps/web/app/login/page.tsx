import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card'

export default function LoginPage() {
  return (
    <main className='min-h-svh p-6 pt-20 w-full grid justify-items-center'>
      <div className='grid max-w-md min-w-0 w-full gap-12 auto-rows-max items-start'>
        <Card className='shadow-md'>
          <CardHeader>
            <CardTitle>Welcome Back!</CardTitle>
            <CardDescription>
              Enter your details below to login.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form></form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
