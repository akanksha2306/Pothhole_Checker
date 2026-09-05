/**
 * @types/google.accounts declares the global `google` namespace but never
 * attaches it to `window`, which is how the GIS script actually exposes it.
 */
interface Window {
  google?: typeof google
}
