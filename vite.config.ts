import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // App installable (PWA) : manifeste, icônes d'écran d'accueil et service worker
    VitePWA({
      // La mise à jour est proposée à l'utilisateur (voir UpdatePrompt) : jamais de rechargement en pleine partie
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Quarto — Jeu de stratégie',
        short_name: 'Quarto',
        description: "Jouez au Quarto contre l'IA, à deux sur le même écran ou en ligne avec un ami.",
        lang: 'fr',
        start_url: '/?source=pwa',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ECEEE8',
        theme_color: '#2E6A58',
        categories: ['games', 'entertainment'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Appui long sur l'icône (Android) / clic droit (bureau)
        shortcuts: [
          { name: "Jouer contre l'IA", short_name: 'Contre l’IA', url: '/vs-ai?source=pwa', icons: [{ src: '/icons/shortcut-96.png', sizes: '96x96' }] },
          { name: 'Partie en ligne', short_name: 'En ligne', url: '/online?source=pwa', icons: [{ src: '/icons/shortcut-96.png', sizes: '96x96' }] },
          { name: 'Local à deux', short_name: 'À deux', url: '/two-player?source=pwa', icons: [{ src: '/icons/shortcut-96.png', sizes: '96x96' }] },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        cleanupOutdatedCaches: true,
        // SPA : toute navigation sert index.html hors ligne… sauf l'API (connexion SSO, enregistrement des parties)
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
