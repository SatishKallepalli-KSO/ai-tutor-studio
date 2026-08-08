import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages project site: /ai-tutor-studio/
// Local/dev and Render single-service: /
const base = process.env.VITE_BASE ?? '/'

export default defineConfig({
  plugins: [react()],
  base,
  server: {
    port: 5173,
    proxy: {
      '/v1': 'http://127.0.0.1:8000',
      '/healthz': 'http://127.0.0.1:8000',
    },
  },
})
