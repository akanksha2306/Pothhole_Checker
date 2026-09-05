import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Hand-written service worker in src/sw.ts; workbox precache manifest is
      // injected into it at build time and it is bundled to dist/sw.js.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      // Emit dist/registerSW.js and let the app entry control registration
      // (see src/lib/pwa.ts) instead of injecting an inline script.
      injectRegister: 'script',
      // The webmanifest is hand-authored in public/manifest.json so the shipped
      // file is exactly what the PWA spec sheet calls for; skip generating a
      // second one and the automatic <link rel="manifest"> injection.
      manifest: false,
      devOptions: {
        // Dev runs over plain HTTP with HMR; no SW in dev.
        enabled: false,
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
