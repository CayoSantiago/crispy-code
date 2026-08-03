import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card'
import { RecentReposList } from '@/components/git/recent-repos-list'
import { RepoForm } from '@/components/git/repo-form'

export default function GitPage() {
  return (
    <div className='grid w-full max-w-md justify-self-center gap-4'>
      <Card className='shadow-md w-full'>
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

      <RecentReposList />
    </div>
  )
}
