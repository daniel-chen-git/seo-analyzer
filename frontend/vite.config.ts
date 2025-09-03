import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwind()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    port: 3000,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'daniel.enadv.online',  // 允許生產域名
      '.ngrok-free.app',  // 允許所有 ngrok-free.app 子域名
      '.ngrok.io',        // 支援舊版 ngrok 域名
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: true,
  },
})
