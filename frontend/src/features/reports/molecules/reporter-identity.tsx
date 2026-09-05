import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface ReporterIdentityProps {
  name: string
  avatarUrl: string | null
  /** Show the email next to the name (admin detail view). */
  email?: string | null
  className?: string
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

/** Reporter name + avatar, optionally with a follow-up email address. */
export function ReporterIdentity({ name, avatarUrl, email, className }: ReporterIdentityProps) {
  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <Avatar className="size-8 shrink-0">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
        <AvatarFallback className="text-label-md">{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-label-lg">{name}</p>
        {email && (
          <a
            href={`mailto:${email}`}
            className="block truncate text-label-md text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
          >
            {email}
          </a>
        )}
      </div>
    </div>
  )
}
