/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /**
   * Google Identity Services OAuth client id. Empty/unset until the Google
   * Cloud Console credentials are provisioned, in which case the login page
   * renders a disabled sign-in state.
   */
  readonly VITE_GOOGLE_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
