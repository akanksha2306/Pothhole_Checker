# Repair Flow Statuses: Grill / Discovery Notes
Date: 2026-09-05 · Goal: pin down how REPORTED → IN_PROGRESS → RESOLVED completes — who adds photos/GPS/timestamps and when, and reconcile with what Phase 3 built.

## Summary / key decisions
- The REPORTED → IN_PROGRESS → RESOLVED ladder with evidence already exists end-to-end (built + verified live). The photo-adding field for the repairing party also exists (repairer stepper: before/after photo, GPS-gated ≤25m, timestamped) — but it is **role-gated to REPAIRER accounts**, and `REPAIRER_EMAILS` is empty, so no account can currently see it. Akanksha experienced this as "there is no way to add the after photo."
- Decision: whoever repairs the pothole adds the photos (crew role) — no citizen progress-update feature for now.
- Unblock path: add Akanksha's Google email to REPAIRER_EMAILS (and ADMIN_EMAILS) → she sees and can use the photo fields on any in-progress pothole.

## Q&A log

### Q1 — Who adds photos/GPS/timestamp when a pothole is in progress?
- Asked: who is the "I" in "I should be able to add a new photo, GPS location, timestamp"?
- Captured (verbatim): "who soever is repairing the pothole, should be able to add the photos, give a field to add the photos in [screenshot] — currently there is no way I can add the after photo."
- Resolved: it's the repairing party. The field already exists (repairer stepper) but was invisible to her because no account holds the REPAIRER role.
- Flags: need Akanksha's Google email (or a crew member's) → REPAIRER_EMAILS + ADMIN_EMAILS. Owner: Akanksha.

### Q2 — 2km vicinity awareness + upvotes (new feature)
- Asked: design for "show potholes within 2km during report; if same → upvote instead of new report; helps officials nudge."
- Captured decisions: upvote = 1 per person per pothole, undoable toggle; any signed-in user can upvote (no distance gate, no photo needed); the 2km list + upvote buttons appear in the REPORT FLOW only (not map callout, not pothole detail).
- Model: 20m SAME/NEW stays the identity check (full report with photo = evidence); upvote is the lightweight "me too" nudge. Officials' priority signal = reports count + upvotes count.

## Open flags (pending input)
- Akanksha's Google email → REPAIRER_EMAILS + ADMIN_EMAILS (also unlocks admin dashboard for her).
