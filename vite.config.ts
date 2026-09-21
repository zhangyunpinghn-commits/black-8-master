import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: '黑8大师',
        short_name: '黑8大师',
        description: '随时开杆的霓虹黑八台球',
        theme_color: '#07151d',
        background_color: '#04090f',
        display: 'standalone',
        orientation: 'landscape',
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }]
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png}'] }
    })
  ],
  test: { environment: 'node', include: ['src/**/*.test.ts'] }
});
