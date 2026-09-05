import { zodResolver } from '@hookform/resolvers/zod'
import { Lock } from 'lucide-react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { communityFormSchema, type CommunityFormValues } from '@/features/community/schemas'

/** Form state as the user is typing (empty optional area allowed). */
type FormInput = z.input<typeof communityFormSchema>
/** Validated values handed to the submit handler. */
type FormOutput = z.output<typeof communityFormSchema>

interface CommunityFormProps {
  /** Previously saved community, used to prefill the fields. */
  defaultValues?: CommunityFormValues | null
  onSubmit: (values: CommunityFormValues) => void
  disabled?: boolean
}

/**
 * Community + location setup, per the reference design: one dark card, labels
 * above inputs, City/State side by side, emerald save action, centred footer
 * note.
 */
export function CommunityForm({ defaultValues, onSubmit, disabled = false }: CommunityFormProps) {
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(communityFormSchema),
    defaultValues: defaultValues ?? { name: '', area: '', city: '', state: '', pinCode: '' },
    mode: 'onSubmit',
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-headline-sm">Set up your community</CardTitle>
        <CardDescription>
          Enter your neighbourhood details to track local road health and repair progress.
        </CardDescription>
      </CardHeader>

      <form
        onSubmit={(event) => {
          void form.handleSubmit(onSubmit)(event)
        }}
        noValidate
      >
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="community-name">Community or Ward Name</Label>
            <Input
              id="community-name"
              autoComplete="organization"
              placeholder="e.g. Koramangala 4th Block Residents Association"
              aria-invalid={form.formState.errors.name !== undefined}
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p role="alert" className="text-body-md text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="community-area">
              Locality / Area <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="community-area"
              placeholder="e.g. 2nd Cross Road, Near BDA Complex"
              aria-invalid={form.formState.errors.area !== undefined}
              {...form.register('area')}
            />
            {form.formState.errors.area && (
              <p role="alert" className="text-body-md text-destructive">
                {form.formState.errors.area.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="community-city">City</Label>
              <Input
                id="community-city"
                autoComplete="address-level2"
                placeholder="e.g. Bengaluru"
                aria-invalid={form.formState.errors.city !== undefined}
                {...form.register('city')}
              />
              {form.formState.errors.city && (
                <p role="alert" className="text-body-md text-destructive">
                  {form.formState.errors.city.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="community-state">State</Label>
              <Input
                id="community-state"
                autoComplete="address-level1"
                placeholder="e.g. Karnataka"
                aria-invalid={form.formState.errors.state !== undefined}
                {...form.register('state')}
              />
              {form.formState.errors.state && (
                <p role="alert" className="text-body-md text-destructive">
                  {form.formState.errors.state.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="community-pin">PIN Code</Label>
            <Input
              id="community-pin"
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="6-digit PIN"
              maxLength={6}
              className="font-mono"
              aria-invalid={form.formState.errors.pinCode !== undefined}
              {...form.register('pinCode')}
            />
            {form.formState.errors.pinCode ? (
              <p role="alert" className="text-body-md text-destructive">
                {form.formState.errors.pinCode.message}
              </p>
            ) : (
              <p className="text-label-md text-muted-foreground">
                You can report potholes you find in this community.
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={disabled}>
            Save Details
          </Button>

          <p className="flex items-center justify-center gap-1.5 pt-1 text-label-md text-muted-foreground">
            <Lock className="size-3.5" aria-hidden="true" />
            Protected under local civic data protocols
          </p>
        </CardContent>
      </form>
    </Card>
  )
}
