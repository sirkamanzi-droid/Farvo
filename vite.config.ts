import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['pwa-icon-192.png', 'pwa-icon-512.png'],
        workbox: {
          importScripts: ['push-sw.js'],
          cleanupOutdatedCaches: true,
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\\/api\\//],
          globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,woff,woff2}'],
        },
        manifest: {
          name: 'Omulimi',
          short_name: 'Omulimi',
          description: 'AI-powered farming advisory for Ugandan smallholder farmers',
          theme_color: '#174432',
          background_color: '#F2ECDF',
          display: 'standalone',
          start_url: '/',
          icons: [
            { src: '/pwa-icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/pwa-icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/pwa-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
      }),
    ],
    resolve: {
      alias: { '@': path.resolve(__dirname, '.') },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
