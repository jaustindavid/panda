/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Auto-update the service worker in the background; no update prompt
      // UI in v1 — the app shell is small and reloads are cheap.
      registerType: 'autoUpdate',
      // Dev: keep the SW available so installability can be verified with
      // `npm run dev`, not only after a build.
      devOptions: { enabled: true },
      includeAssets: ['favicon-48.png', 'apple-touch-icon.png'],
      workbox: {
        // Firebase Auth serves its sign-in handler + iframe from /__/auth/*
        // on the hosting domain. Without this, the SPA navigation fallback
        // serves index.html for those routes, the OAuth handshake never
        // completes, and the app hangs on "Loading…". Exclude all Firebase
        // reserved /__/ paths from the navigation fallback so the real
        // handler loads from the network.
        navigateFallbackDenylist: [/^\/__\//],
      },
      manifest: {
        name: 'panda',
        short_name: 'panda',
        description: 'Where can we eat right now? — for a small circle.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
