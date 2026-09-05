import { LoaderCircle, ThumbsDown, ThumbsUp } from 'lucide-react'
import { useState } from 'react'
import type { Repair, RepairVerdict } from 'shared'

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
import { EvidenceSlot } from '@/features/repairs/components/evidence-slot'
import { useVerifyRepair } from '@/features/repairs/queries'
import { isApiError } from '@/lib/api'
import { errorMessage } from '@/lib/error-message'
import { cn } from '@/lib/utils'

interface RepairVerificationCardProps {
  potholeHumanCode: string
  repair: Repair
  className?: string
}

/**
 * Resident verdict card, shown while the repair is AWAITING_VERIFICATION and
 * the viewer has not voted yet (`verifications.myVerdict === null`). The
 * backend enforces who may vote (reporters of the pothole; admins exempt);
 * this card hides itself from repairers.
 */
export function RepairVerificationCard({
  potholeHumanCode,
  repair,
  className,
}: RepairVerificationCardProps) {
  const verify = useVerifyRepair(potholeHumanCode, repair.id)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const myVerdict = repair.verifications.myVerdict

  async function vote(verdict: RepairVerdict) {
    setError(null)
    try {
      await verify.mutateAsync({
        verdict,
        ...(note.trim().length > 0 ? { note: note.trim() } : {}),
      })
    } catch (submitError: unknown) {
      setError(
        isApiError(submitError)
          ? submitError.message
          : errorMessage(submitError, 'Could not save your verdict. Try again.'),
      )
    }
  }

  // Already voted: show the recorded verdict and the running tally.
  if (myVerdict !== null) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="font-heading text-headline-sm">
            {myVerdict === 'FIXED' ? 'You verified: Fixed' : 'You verified: Not fixed'}
          </CardTitle>
          <CardDescription>
            {repair.verifications.total}{' '}
            {repair.verifications.total === 1 ? 'verdict' : 'verdicts'} so far ·{' '}
            {repair.verifications.fixed} fixed · {repair.verifications.notFixed} not fixed
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className={cn('border-primary/30', className)}>
      <CardHeader>
        <CardTitle className="font-heading text-headline-sm">Did this actually get fixed?</CardTitle>
        <CardDescription>
          The crew marked this pothole repaired. Stand at the spot and confirm what you see.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <EvidenceSlot
            repairId={repair.id}
            stage="before"
            at={repair.before?.at}
            latitude={repair.before?.latitude}
            longitude={repair.before?.longitude}
          />
          <EvidenceSlot
            repairId={repair.id}
            stage="after"
            at={repair.after?.at}
            latitude={repair.after?.latitude}
            longitude={repair.after?.longitude}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`verify-note-${repair.id}`}>Add a note (optional)</Label>
          <Textarea
            id={`verify-note-${repair.id}`}
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Anything the crew or the ward office should know?"
          />
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2.5 text-body-md text-destructive">
            {error}
          </p>
        )}
      </CardContent>

      <CardFooter className="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          disabled={verify.isPending}
          onClick={() => {
            void vote('FIXED')
          }}
        >
          {verify.isPending ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <ThumbsUp className="size-4" aria-hidden="true" />
          )}
          Yes, it&apos;s fixed
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={verify.isPending}
          onClick={() => {
            void vote('NOT_FIXED')
          }}
        >
          <ThumbsDown className="size-4" aria-hidden="true" />
          No, still broken
        </Button>
      </CardFooter>
    </Card>
  )
}
