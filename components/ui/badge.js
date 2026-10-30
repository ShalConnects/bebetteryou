import { cva } from 'class-variance-authority'
import { cn } from '@/libs/cn'

const badgeVariants = cva('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', {
  variants: {
    variant: {
      default: 'border-transparent bg-primary/15 text-primary',
      muted: 'border-transparent bg-muted text-muted-foreground',
      warn: 'border-transparent bg-amber-400/15 text-amber-300',
      danger: 'border-transparent bg-destructive/15 text-red-300',
      outline: 'border-border text-foreground',
    },
  },
  defaultVariants: { variant: 'default' },
})

export function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
