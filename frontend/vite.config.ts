import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { resolve } from 'path'
import { plugin as mdPlugin } from 'vite-plugin-markdown'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    mdPlugin({ mode: ['raw'] })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'sql-wasm': ['sql.js'],
        },
      },
    },
  },
  // Configuración del servidor de desarrollo
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
