import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description: string
  /** Optional call to action rendered below the copy. */
  action?: ReactNode
  className?: string
}

/** Civic Flow empty state: tinted circle icon, headline-sm, body-md copy. */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-outline bg-card px-6 py-12 text-center shadow-card',
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-6" aria-hidden="true" />
      </div>
      <div className="space-y-1.5">
        <p className="font-heading text-headline-sm text-foreground">{title}</p>
        <p className="mx-auto max-w-xs text-body-md text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  )
}
