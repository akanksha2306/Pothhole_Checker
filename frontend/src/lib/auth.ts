/**
 * Google Identity Services integration.
 *
 * Everything Google-specific lives here: loading the GIS script, reading the
 * client id, rendering the button and receiving the ID token credential. The
 * login page only ever sees `isGoogleSignInConfigured()`,
 * `renderGoogleSignInButton()` and the auth store's `signIn()`.
 *
 * Auth flow: the GIS ID token is posted to `POST /api/auth/google`, which
 * verifies it with Google and sets the httpOnly `pw_session` cookie.
 */

const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

export class GoogleSignInError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GoogleSignInError'
  }
}

/** True when a Google OAuth client id is configured for this build. */
export function isGoogleSignInConfigured(): boolean {
  return readClientId() !== null
}

function readClientId(): string | null {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  return clientId && clientId.trim().length > 0 ? clientId.trim() : null
}

let gisScriptPromise: Promise<void> | null = null

/** Loads (once) the GIS script from accounts.google.com. */
export function loadGoogleIdentityServices(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new GoogleSignInError('Google Identity Services needs a browser.'))
  }
  if (window.google?.accounts?.id) {
    return Promise.resolve()
  }
  if (gisScriptPromise) {
    return gisScriptPromise
  }

  gisScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GIS_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => {
      if (window.google?.accounts?.id) {
        resolve()
      } else {
        reject(new GoogleSignInError('Google Identity Services loaded but did not initialise.'))
      }
    }
    script.onerror = () => {
      // Allow a later retry if the network blips.
      gisScriptPromise = null
      reject(new GoogleSignInError('Could not load Google Identity Services.'))
    }
    document.head.appendChild(script)
  })

  return gisScriptPromise
}

export interface GoogleSignInHandlers {
  /** Receives the Google ID token (JWT) to exchange for a backend session. */
  onCredential: (credential: string) => void
}

/**
 * Initialises GIS and renders the official sign-in button into `container`.
 * Throws `GoogleSignInError` when no client id is configured or the script is
 * not loaded yet — the login page guards both cases before calling this.
 */
export function renderGoogleSignInButton(container: HTMLElement, handlers: GoogleSignInHandlers): void {
  const clientId = readClientId()
  const googleId = window.google?.accounts?.id

  if (!clientId) {
    throw new GoogleSignInError('VITE_GOOGLE_CLIENT_ID is not set for this build.')
  }
  if (!googleId) {
    throw new GoogleSignInError('Google Identity Services has not finished loading.')
  }

  googleId.initialize({
    client_id: clientId,
    callback: (response: google.accounts.id.CredentialResponse) =>
      handlers.onCredential(response.credential),
    use_fedcm_for_prompt: true,
  })

  googleId.renderButton(container, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'continue_with',
    shape: 'pill',
    logo_alignment: 'left',
    width: 280,
  })
}
