import { LoaderCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface LoadMoreButtonProps {
  onClick: () => void
  loading?: boolean
  label?: string
}

/** Cursor pagination affordance shared by the citizen and admin lists. */
export function LoadMoreButton({
  onClick,
  loading = false,
  label = 'Load more reports',
}: LoadMoreButtonProps) {
  return (
    <Button
      variant="outline"
      className="w-full"
      onClick={onClick}
      disabled={loading}
      aria-busy={loading}
    >
      {loading && <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />}
      {loading ? 'Loading…' : label}
    </Button>
  )
}
