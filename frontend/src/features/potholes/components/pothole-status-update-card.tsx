import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { useEffect, useState } from 'react'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { ReportStatus } from 'shared'
import { useUpdatePotholeStatus } from '@/features/potholes/queries'
import { potholeStatusFormSchema, type PotholeStatusFormValues } from '@/features/potholes/schemas'
import { errorMessage } from '@/lib/error-message'
import { MANUAL_POTHOLE_STATUSES, REPORT_STATUS_META, reportStatusMeta } from '@/lib/report-status'

interface PotholeStatusUpdateCardProps {
  idOrHumanCode: string
  status: ReportStatus
  /** Citizens affected by this one pothole, for the admin context line. */
  reportCount: number
  className?: string
}

/** Admin control: move a pothole along its lifecycle via the pothole endpoint. */
export function PotholeStatusUpdateCard({
  idOrHumanCode,
  status,
  reportCount,
  className,
}: PotholeStatusUpdateCardProps) {
  const updateStatus = useUpdatePotholeStatus(idOrHumanCode)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // AWAITING_VERIFICATION/RESOLVED cannot be typed in by hand, so the form
  // defaults to the closest manual status (IN_PROGRESS) for those.
  const initialStatus = coerceManualStatus(status)
  const form = useForm<PotholeStatusFormValues>({
    resolver: zodResolver(potholeStatusFormSchema),
    defaultValues: { status: initialStatus },
  })

  useEffect(() => {
    form.reset({ status: coerceManualStatus(status) })
  }, [status, form])

  const selectedStatus = form.watch('status')
  const dirty = selectedStatus !== initialStatus
  const currentMeta = reportStatusMeta(status)

  const onSubmit = form.handleSubmit(async (values) => {
    setUpdateError(null)
    try {
      await updateStatus.mutateAsync({
        status: values.status,
        ...(values.note && values.note.trim().length > 0 ? { note: values.note.trim() } : {}),
      })
      setSaved(true)
    } catch (error: unknown) {
      form.setValue('status', coerceManualStatus(status))
      setUpdateError(errorMessage(error, 'Could not save the status change. Try again.'))
    }
  })

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Update status</CardTitle>
        <CardDescription>
          Currently {currentMeta.label.toLowerCase()}. {currentMeta.description}
        </CardDescription>
      </CardHeader>

      <form
        onSubmit={(event) => {
          void onSubmit(event)
        }}
        noValidate
      >
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status">New status</Label>
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) => field.onChange(value as PotholeStatusFormValues['status'])}
                  disabled={updateStatus.isPending}
                >
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue placeholder="Choose a status" />
                  </SelectTrigger>
                  <SelectContent>
                    {MANUAL_POTHOLE_STATUSES.map((option) => (
                      <SelectItem key={option} value={option}>
                        {REPORT_STATUS_META[option].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note for the timeline (optional)</Label>
            <Textarea
              id="note"
              rows={2}
              placeholder="e.g. Crew 7 scheduled for Thursday morning"
              {...form.register('note')}
            />
          </div>

          <p className="text-label-md text-muted-foreground">
            1 pothole · {reportCount} {reportCount === 1 ? 'citizen' : 'citizens'} affected
          </p>

          {updateError && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2.5 text-body-md text-destructive">
              {updateError}
            </p>
          )}

          {!updateError && saved && !dirty && (
            <p role="status" className="rounded-lg bg-primary/10 px-3 py-2.5 text-body-md text-primary">
              Status saved. Everyone watching this pothole sees it immediately.
            </p>
          )}
        </CardContent>

        <CardFooter>
          <Button type="submit" className="w-full" disabled={!dirty || updateStatus.isPending}>
            {updateStatus.isPending ? 'Saving…' : 'Save status update'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

/** Nearest manually-settable status for a pothole's current state. */
function coerceManualStatus(status: ReportStatus): PotholeStatusFormValues['status'] {
  return status === 'REPORTED' || status === 'ACKNOWLEDGED' ? status : 'IN_PROGRESS'
}
