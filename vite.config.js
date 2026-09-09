import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
  },
  // Base path for GitHub Pages
  base: process.env.NODE_ENV === 'production' ? '/4DTasks/' : '/',
  server: {
    port: 5173,
    open: !process.env.DOCKER_CONTAINER,
    // Proxy delegation API to backend so requests work with or without VITE_API_URL
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  }
})

