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
          globIgnores: ['**/ort-wasm*.wasm'],
          runtimeCaching: [{
            urlPattern: /ort-wasm.*\.wasm$/,
            handler: 'CacheFirst',
            options: { cacheName: 'onnx-runtime-cache' },
          }],
        },
        manifest: {
          name: 'Farvo',
          short_name: 'Farvo',
          description: 'AI-powered farming advisory for Ugandan smallholder farmers',
          theme_color: '#2F5226',
          background_color: '#F1EBDC',
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
