import { LoaderCircle } from 'lucide-react'

import { cn } from '@/lib/utils'

interface FullPageLoaderProps {
  label?: string
  className?: string
}

/** Centred spinner used while the session resolves or a route chunk loads. */
export function FullPageLoader({ label = 'Loading…', className }: FullPageLoaderProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-20', className)}>
      <LoaderCircle className="size-6 animate-spin text-primary" aria-hidden="true" />
      <p className="text-body-md text-muted-foreground">{label}</p>
    </div>
  )
}
