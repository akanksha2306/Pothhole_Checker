import { LoaderCircle, MapPin, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { FullPageLoader } from '@/components/molecules/full-page-loader'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-provider'
import {
  GoogleSignInError,
  isGoogleSignInConfigured,
  loadGoogleIdentityServices,
  renderGoogleSignInButton,
} from '@/lib/auth'
import { isApiError } from '@/lib/api'

type GisState = 'loading' | 'ready' | 'unconfigured' | 'failed'

const VALUE_PROPS = [
  'Snap the pothole — camera and GPS are attached automatically.',
  'Track every report from reported to repaired.',
  'Municipal admins triage and close reports in one dashboard.',
] as const

/**
 * Login, per the Stitch landing screen: green logo mark, bold headline,
 * supporting copy, then the sign-in action. GIS behaviour is unchanged — with
 * no client id configured the button renders in a disabled state with a note.
 */
export function LoginPage() {
  const { signIn, status } = useAuth()
  const configured = isGoogleSignInConfigured()
  const [gisState, setGisState] = useState<GisState>(configured ? 'loading' : 'unconfigured')
  const [signingIn, setSigningIn] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const buttonContainerRef = useRef<HTMLDivElement | null>(null)

  const handleCredential = useCallback(
    async (credential: string) => {
      setSigningIn(true)
      setNotice(null)
      try {
        await signIn(credential)
        // RedirectIfAuthenticated picks up the new session and routes by role.
      } catch (error: unknown) {
        setNotice(
          isApiError(error)
            ? error.message
            : error instanceof GoogleSignInError || error instanceof Error
              ? error.message
              : 'Sign-in failed.',
        )
      } finally {
        setSigningIn(false)
      }
    },
    [signIn],
  )

  useEffect(() => {
    if (!configured) {
      setGisState('unconfigured')
      return
    }

    let cancelled = false
    setGisState('loading')

    loadGoogleIdentityServices()
      .then(() => {
        const container = buttonContainerRef.current
        if (cancelled || !container) {
          return
        }
        renderGoogleSignInButton(container, { onCredential: (credential) => void handleCredential(credential) })
        setGisState('ready')
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }
        setGisState('failed')
        setNotice(error instanceof Error ? error.message : 'Could not start Google sign-in.')
      })

    return () => {
      cancelled = true
    }
  }, [configured, handleCredential])

  if (status === 'loading') {
    return <FullPageLoader label="Checking your session…" />
  }

  // The router's PageShell layout route provides the app chrome; this page is
  // pure content.
  return (
    <div className="flex flex-col gap-8 py-6">
        <header className="space-y-4 text-center">
          <div className="flex justify-center">
            <span className="flex size-20 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-glow-lg">
              <MapPin className="size-10" aria-hidden="true" />
            </span>
          </div>
          <div className="space-y-2">
            <h1 className="font-heading text-headline-lg-mobile tracking-tight">
              Report once.
              <br />
              Track forever.
            </h1>
            <p className="mx-auto max-w-[19rem] text-body-lg text-muted-foreground">
              PotholeWatch gets street problems in front of the crews who fix them — with a photo,
              a pin and a public paper trail.
            </p>
          </div>
        </header>

        <ul className="space-y-3">
          {VALUE_PROPS.map((line) => (
            <li key={line} className="flex items-start gap-3">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              <span className="text-body-md text-foreground">{line}</span>
            </li>
          ))}
        </ul>

        <div className="space-y-3">
          {/* React renders its states and Google's button as SIBLINGS: the ref
              node is handed to renderButton() empty and GIS mutates its children
              afterwards. React-owned nodes inside it would crash the reconciler
              (removeChild NotFoundError) when Google wipes them. */}
          {gisState === 'unconfigured' && (
            <div className="flex min-h-12 items-center justify-center">
              <Button disabled size="lg" className="w-full">
                <ShieldCheck className="size-5" aria-hidden="true" />
                Continue with Google
              </Button>
            </div>
          )}
          {gisState === 'loading' && (
            <div className="flex min-h-12 items-center justify-center">
              <span className="flex items-center gap-2 text-body-md text-muted-foreground">
                <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
                Loading Google sign-in…
              </span>
            </div>
          )}
          <div ref={buttonContainerRef} className="flex w-full justify-center" />

          {signingIn && (
            <p
              role="status"
              className="flex items-center justify-center gap-2 text-body-md text-muted-foreground"
            >
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Signing you in…
            </p>
          )}

          {gisState === 'unconfigured' && (
            <p className="rounded-lg bg-muted px-4 py-3 text-label-md text-muted-foreground">
              Google sign-in is disabled for this build:{' '}
              <code className="font-mono">VITE_GOOGLE_CLIENT_ID</code> is not set. Add it to{' '}
              <code className="font-mono">frontend/.env</code> and restart the dev server to enable
              the Google button.
            </p>
          )}

          {gisState === 'failed' && (
            <p
              role="alert"
              className="rounded-lg bg-destructive/10 px-4 py-3 text-body-md text-destructive"
            >
              {notice ?? 'Google sign-in could not be loaded.'}
            </p>
          )}

          {notice && gisState !== 'failed' && (
            <p
              role="alert"
              className="rounded-lg bg-destructive/10 px-4 py-3 text-body-md text-destructive"
            >
              {notice}
            </p>
          )}
        </div>

    <p className="text-label-md text-muted-foreground">
      By continuing you agree that reports you file may be shared with the municipal works
      department. Your session is a secure, httpOnly cookie — no tokens stored in the browser.
    </p>
    </div>
  )
}
