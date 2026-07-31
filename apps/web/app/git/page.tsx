import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card'
import { RepoForm } from '@/components/git/repo-form'

export default function GitPage() {
  return (
    <Card className='shadow-md w-full max-w-md justify-self-center'>
      <CardHeader>
        <CardTitle>Connect a repository</CardTitle>
        <CardDescription>
          Browse the commit history of any public GitHub repository.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RepoForm />
      </CardContent>
    </Card>
  )
}
