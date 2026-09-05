/**
 * PotholeWatch service worker (vite-plugin-pwa `injectManifest` mode).
 *
 * `self.__WB_MANIFEST` is the injection point: at build time vite-plugin-pwa
 * replaces it with the Vite build manifest and bundles this file to `dist/sw.js`.
 *
 * Caching policy:
 * - App shell + build assets: workbox precache (revisioned, refreshed on deploy).
 * - SPA navigations: always served the precached `index.html`.
 * - Everything else same-origin, plus Google Fonts: cache-first, exactly the
 *   behaviour the hand-written worker had (`cached || fetch`), with runtime
 *   population for entries that were not precached.
 */

import { clientsClaim } from 'workbox-core'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

// lib.webworker types the global `self` as a plain WorkerGlobalScope; this file
// is loaded as a service worker, so narrow it to the real scope.
declare const self: ServiceWorkerGlobalScope

const CACHE_NAME = 'potholewatch-v1'
const FONT_CACHE_NAME = 'potholewatch-fonts-v1'

/** Precached document served for every SPA navigation. */
const APP_SHELL_URL = 'index.html'

/** Inter font stylesheet, kept warm at install so first paint works offline. */
const GOOGLE_FONTS_CSS_URL =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'

const FONT_HOSTNAMES = new Set(['fonts.googleapis.com', 'fonts.gstatic.com'])

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      // Best effort: a fonts outage must not block installation of the worker.
      try {
        const fontCache = await caches.open(FONT_CACHE_NAME)
        await fontCache.add(GOOGLE_FONTS_CSS_URL)
      } catch (error) {
        console.warn('[sw] could not precache Google Fonts', error)
      }
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Drop our own legacy caches (e.g. 'potholewatch-v0') that precache does not own.
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames
          .filter((name) => name.startsWith('potholewatch-') && !name.endsWith('-v1'))
          .map((name) => caches.delete(name)),
      )
    })(),
  )
})

// 1. Revisioned precache for everything Vite emitted.
precacheAndRoute(self.__WB_MANIFEST)

// Drop precache leftovers from previous workbox versions.
cleanupOutdatedCaches()

// Take control of open pages immediately so the first visit is covered too.
clientsClaim()

// 2. Client-side routes have no server-side counterpart: serve the shell.
registerRoute(new NavigationRoute(createHandlerBoundToURL(APP_SHELL_URL)))

// 3. Cache-first for same-origin assets and Google Fonts.
registerRoute(
  ({ request, url }) =>
    request.method === 'GET' &&
    (url.origin === self.location.origin || FONT_HOSTNAMES.has(url.hostname)),
  async ({ request }) => {
    const cacheName = FONT_HOSTNAMES.has(new URL(request.url).hostname)
      ? FONT_CACHE_NAME
      : CACHE_NAME

    const cache = await caches.open(cacheName)
    const cached = await cache.match(request)
    if (cached) {
      return cached
    }

    const response = await fetch(request)
    if (response.ok) {
      await cache.put(request, response.clone())
    }
    return response
  },
)
