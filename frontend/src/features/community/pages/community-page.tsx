import { useState } from 'react'

import { CommunityForm } from '@/features/community/components/community-form'
import { CommunitySummaryCard } from '@/features/community/components/community-summary-card'
import type { CommunityFormValues } from '@/features/community/schemas'
import { loadCommunity, saveCommunity } from '@/lib/community'

/**
 * Community tab. Persistence is local for now (localStorage via
 * `lib/community.ts`) — backend persistence is pending, so the saved value is
 * treated as a convenience prefill, not a source of truth.
 */
export function CommunityPage() {
  const [saved, setSaved] = useState(() => loadCommunity())
  const [editing, setEditing] = useState(() => loadCommunity() === null)

  function handleSubmit(values: CommunityFormValues) {
    setSaved(
      saveCommunity({
        name: values.name,
        ...(values.area && values.area.trim().length > 0 ? { area: values.area.trim() } : {}),
        city: values.city,
        state: values.state,
        pinCode: values.pinCode,
      }),
    )
    setEditing(false)
  }

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="font-heading text-headline-md tracking-tight">Community</h1>
        <p className="text-body-md text-muted-foreground">
          Track road health for the streets you actually use.
        </p>
      </header>

      {editing || saved === null ? (
        <CommunityForm
          defaultValues={
            saved
              ? {
                  name: saved.name,
                  ...(saved.area !== undefined ? { area: saved.area } : {}),
                  city: saved.city,
                  state: saved.state,
                  pinCode: saved.pinCode,
                }
              : null
          }
          onSubmit={handleSubmit}
        />
      ) : (
        <CommunitySummaryCard community={saved} onEdit={() => setEditing(true)} />
      )}
    </div>
  )
}
