import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import { resolve } from 'node:path'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname

// Read version from package.json
const packageJson = JSON.parse(readFileSync(resolve(projectRoot, 'package.json'), 'utf-8'))
const appVersion = packageJson.version

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // NOTE: React is intentionally NOT in a separate chunk.
          // It must be in the main bundle to ensure it loads before
          // any components that depend on it (like recharts).

          // Charts - only needed for analytics
          if (id.includes('node_modules/recharts/') ||
              id.includes('node_modules/d3')) {
            return 'vendor-charts'
          }

          // Animation library
          if (id.includes('node_modules/framer-motion/')) {
            return 'vendor-motion'
          }

          // PDF export - rarely used, load on demand
          if (id.includes('node_modules/jspdf/') ||
              id.includes('node_modules/html2canvas/')) {
            return 'vendor-pdf'
          }

          // Form handling
          if (id.includes('node_modules/react-hook-form/') ||
              id.includes('node_modules/@hookform/') ||
              id.includes('node_modules/zod/')) {
            return 'vendor-forms'
          }

          // Supabase client
          if (id.includes('node_modules/@supabase/')) {
            return 'vendor-supabase'
          }

          // TanStack libraries
          if (id.includes('node_modules/@tanstack/')) {
            return 'vendor-tanstack'
          }

          // Date utilities
          if (id.includes('node_modules/date-fns/')) {
            return 'vendor-date'
          }

          // Drag and drop
          if (id.includes('node_modules/@dnd-kit/')) {
            return 'vendor-dnd'
          }

          // Icons - separate chunk to avoid bloating main bundle
          if (id.includes('node_modules/lucide-react/') ||
              id.includes('node_modules/@heroicons/') ||
              id.includes('node_modules/@phosphor-icons/')) {
            return 'vendor-icons'
          }

          // Radix UI primitives - shared across components
          if (id.includes('node_modules/@radix-ui/')) {
            return 'vendor-radix'
          }

          // Carousel
          if (id.includes('node_modules/embla-carousel')) {
            return 'vendor-carousel'
          }

          // Command menu
          if (id.includes('node_modules/cmdk/')) {
            return 'vendor-cmdk'
          }
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Baseline - Health Tracking',
        short_name: 'Baseline',
        description: 'Know your baseline, spot the changes. Track pain, mood, and any metric that matters.',
        theme_color: '#0d9488',
        background_color: '#fafaf9',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Allow bundles up to 2.5 MiB to be precached (default is 2 MiB)
        // With code splitting, individual chunks should be much smaller
        maximumFileSizeToCacheInBytes: 2.5 * 1024 * 1024, // 2.5 MiB
        // Cache strategies for different resource types
        runtimeCaching: [
          {
            // Cache API responses with network-first strategy
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache static assets with cache-first strategy
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            // Cache Google Fonts
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
        // Don't precache source maps
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      devOptions: {
        enabled: false, // Disable PWA in development to avoid caching issues
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(projectRoot, 'src')
    }
  },
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
  },
});
