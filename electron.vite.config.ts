import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        external: ['better-sqlite3', 'node-cron']
      }
    }
  },
  preload: {},
  renderer: {
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'src/renderer/index.html'),
          quickAdd: resolve(__dirname, 'src/renderer/quick-add.html')
        }
      }
    }
  }
})
