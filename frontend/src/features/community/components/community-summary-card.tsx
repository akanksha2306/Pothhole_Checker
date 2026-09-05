import { CheckCircle2, MapPin, Pencil } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/format'
import type { Community } from '@/lib/community'

interface CommunitySummaryCardProps {
  community: Community
  onEdit: () => void
}

/** Saved-community view, with the "report potholes here" note and an Edit action. */
export function CommunitySummaryCard({ community, onEdit }: CommunitySummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="font-heading text-headline-sm">Your community</CardTitle>
            <CardDescription>
              Saved {formatDate(community.savedAt)} · reports you file are tagged to it.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="size-4" aria-hidden="true" />
            Edit
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2 rounded-lg bg-surface-sunken p-4">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-body-lg font-semibold text-foreground">{community.name}</p>
          </div>
          {community.area && community.area.trim().length > 0 && (
            <p className="text-body-md text-muted-foreground">{community.area}</p>
          )}
          <p className="text-body-md text-muted-foreground">
            {community.city}, {community.state} {community.pinCode}
          </p>
        </div>

        <p
          role="status"
          className="flex items-start gap-2 rounded-lg bg-primary/10 px-3 py-2.5 text-body-md text-primary"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Community saved — report potholes you find in your community.
        </p>
      </CardContent>
    </Card>
  )
}
