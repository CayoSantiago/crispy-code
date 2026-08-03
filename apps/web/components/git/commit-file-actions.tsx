import { Button } from '@repo/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu'
import {
  DownloadIcon,
  ExternalLinkIcon,
  MoreHorizontalIcon,
} from 'lucide-react'
import type { GitHubCommitFile } from '@/features/github/types'

export function CommitFileActions({
  file,
  className,
}: {
  file: GitHubCommitFile
  className?: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant='ghost' size='icon-sm' className={className} />}
      >
        <MoreHorizontalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent side='bottom' align='end' className='w-fit'>
        <DropdownMenuGroup>
          <DropdownMenuItem
            render={<a href={file.blob_url} target='_blank' rel='noopener' />}
          >
            <ExternalLinkIcon className='text-muted-foreground' />
            <span>View on GitHub</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            render={<a href={file.raw_url} target='_blank' rel='noopener' />}
          >
            <DownloadIcon className='text-muted-foreground' />
            <span>Download file</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
