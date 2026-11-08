import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// On GitHub Pages the app lives under /reservation_app/
export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/reservation_app/' : '/',
  plugins: [react(), tailwindcss()],
})
