import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig({
  base: './',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('react') || id.includes('scheduler')) {
            return 'vendor-react';
          }

          if (id.includes('react-router')) {
            return 'vendor-router';
          }

          if (id.includes('home-assistant-js-websocket')) {
            return 'vendor-ha-ws';
          }

          if (id.includes('leaflet')) {
            return 'vendor-leaflet';
          }

          if (id.includes('lucide-react')) {
            return 'vendor-icons-lucide';
          }

          if (id.includes('@mdi/js')) {
            return 'vendor-icons-mdi-js';
          }

          if (id.includes('@mdi/react')) {
            return 'vendor-icons-mdi-react';
          }

          if (id.includes('react-icons/fa6')) {
            return 'vendor-icons-react-fa6';
          }

          if (id.includes('react-icons/md')) {
            return 'vendor-icons-react-md';
          }

          if (id.includes('react-icons/fi')) {
            return 'vendor-icons-react-fi';
          }

          if (id.includes('react-icons/bi')) {
            return 'vendor-icons-react-bi';
          }

          if (id.includes('react-icons/cg')) {
            return 'vendor-icons-react-cg';
          }

          if (id.includes('react-icons/ri')) {
            return 'vendor-icons-react-ri';
          }

          if (id.includes('react-icons/tb')) {
            return 'vendor-icons-react-tb';
          }

          if (id.includes('react-icons/bs')) {
            return 'vendor-icons-react-bs';
          }

          if (id.includes('react-icons/gi')) {
            return 'vendor-icons-react-gi';
          }

          if (id.includes('react-icons')) {
            return 'vendor-icons-react-misc';
          }

          return 'vendor-misc';
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/__tests__/setup.js',
  }
})
