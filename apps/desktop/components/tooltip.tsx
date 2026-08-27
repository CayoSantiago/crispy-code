import {
  Tooltip as ShadcnTooltip,
  TooltipContent,
  TooltipTrigger,
} from '@repo/ui/components/tooltip'

export function Tooltip({
  tooltip,
  ...props
}: React.ComponentProps<typeof TooltipTrigger> & { tooltip: React.ReactNode }) {
  return (
    <ShadcnTooltip>
      <TooltipTrigger {...props} />
      <TooltipContent>
        {typeof tooltip === 'string' ? <p>{tooltip}</p> : tooltip}
      </TooltipContent>
    </ShadcnTooltip>
  )
}
