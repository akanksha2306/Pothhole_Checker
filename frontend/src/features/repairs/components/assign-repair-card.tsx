import { HardHat } from 'lucide-react'
import { useState } from 'react'
import type { Repair } from 'shared'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RepairStatusBadge } from '@/components/molecules/repair-status-badge'
import { useAssignRepair } from '@/features/repairs/queries'
import { isApiError } from '@/lib/api'
import { errorMessage } from '@/lib/error-message'
import { cn } from '@/lib/utils'

interface AssignRepairCardProps {
  potholeHumanCode: string
  onAssigned?: (repair: Repair) => void
  className?: string
}

/**
 * Admin primary action: put a crew on this pothole. Replaces the old RESOLVED
 * status option — resolution is earned by a verified repair, not typed in.
 */
export function AssignRepairCard({ potholeHumanCode, onAssigned, className }: AssignRepairCardProps) {
  const assign = useAssignRepair(potholeHumanCode)
  const [note, setNote] = useState('')
  const [open, setOpen] = useState(false)
  const [assignedRepair, setAssignedRepair] = useState<Repair | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    setError(null)
    try {
      const repair = await assign.mutateAsync(
        note.trim().length > 0 ? { note: note.trim() } : {},
      )
      setAssignedRepair(repair)
      setOpen(false)
      setNote('')
      onAssigned?.(repair)
    } catch (assignError: unknown) {
      setError(
        isApiError(assignError)
          ? assignError.message
          : errorMessage(assignError, 'Could not assign a crew. Try again.'),
      )
    }
  }

  return (
    <Card className={cn('border-primary/30', className)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="font-heading text-headline-sm">Assign repair</CardTitle>
            <CardDescription>
              Put a crew on this pothole. It is resolved once residents verify the repair — not
              before.
            </CardDescription>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <HardHat className="size-5" aria-hidden="true" />
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {assignedRepair ? (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-sunken px-3 py-2.5">
            <div className="min-w-0 space-y-0.5">
              <p className="text-body-md font-semibold text-foreground">Repair assigned</p>
              <p className="text-label-md text-muted-foreground">
                Waiting for the crew to pick it up and start evidence.
              </p>
            </div>
            <RepairStatusBadge status={assignedRepair.status} />
          </div>
        ) : open ? (
          <div className="space-y-2">
            <Label htmlFor={`assign-note-${potholeHumanCode}`}>Note for the crew (optional)</Label>
            <Textarea
              id={`assign-note-${potholeHumanCode}`}
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="e.g. Deep pothole, needs asphalt — crew 7"
              autoFocus
            />
            {error && (
              <p
                role="alert"
                className="rounded-lg bg-destructive/10 px-3 py-2.5 text-body-md text-destructive"
              >
                {error}
              </p>
            )}
          </div>
        ) : (
          error && (
            <p
              role="alert"
              className="rounded-lg bg-destructive/10 px-3 py-2.5 text-body-md text-destructive"
            >
              {error}
            </p>
          )
        )}
      </CardContent>

      <CardFooter className="grid gap-2 sm:grid-cols-2">
        {assignedRepair ? (
          <Button type="button" variant="outline" className="sm:col-span-2" onClick={() => setOpen(true)}>
            Assign another crew
          </Button>
        ) : open ? (
          <>
            <Button
              type="button"
              disabled={assign.isPending}
              onClick={() => {
                void confirm()
              }}
            >
              {assign.isPending ? 'Assigning…' : 'Confirm assignment'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={assign.isPending}
              onClick={() => {
                setOpen(false)
                setError(null)
              }}
            >
              Cancel
            </Button>
          </>
        ) : (
          <Button
            type="button"
            className="sm:col-span-2"
            onClick={() => {
              setOpen(true)
              setError(null)
            }}
          >
            Assign repair
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
