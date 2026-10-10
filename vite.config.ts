import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/ruijin-onc-radar/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'icons/icon-192.png',
        'icons/icon-512.png',
        'logo-ruijin.png',
        'data.json',
      ],
      manifest: {
        name: '瑞金肿瘤内科科研雷达',
        short_name: 'RJ-Onc Radar',
        description: '瑞金医院肿瘤内科胃肠癌症科研文献与临床试验追踪',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/ruijin-onc-radar/',
        scope: '/ruijin-onc-radar/',
        lang: 'zh-CN',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/ruijin-onc-radar/index.html',
        // 预缓存静态资源（含 data.json / logo），二次打开更快
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,webmanifest}'],
        runtimeCaching: [
          {
            // 数据：先返回缓存，同时后台拉新（加快二次加载）
            urlPattern: ({ url }) => url.pathname.endsWith('/data.json'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'rj-onc-data',
              expiration: {
                maxEntries: 8,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // 字体：缓存优先
            urlPattern: ({ url }) =>
              url.hostname === 'fonts.googleapis.com' ||
              url.hostname === 'fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'rj-onc-fonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
})
