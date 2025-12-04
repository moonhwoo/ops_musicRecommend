import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
   server: {
    proxy: {
      '/api': 'http://backend:4000',
      '/currently-playing': 'http://backend:4000',
      '/live':'http://backend:4000',
    }    
  }
})