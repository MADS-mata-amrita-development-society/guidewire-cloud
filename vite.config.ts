import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@portals': path.resolve(__dirname, './src/portals'),
      '@services': path.resolve(__dirname, './src/services'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@config': path.resolve(__dirname, './src/config'),
      '@design': path.resolve(__dirname, './src/design'),
      '@types': path.resolve(__dirname, './src/types'),
    },
  },
  server: {
    port: 5173,
    host: true,
    // Allow all .localhost subdomains for portal routing
    allowedHosts: [
      'localhost',
      'driver.localhost',
      'manager.localhost',
      'admin.localhost',
    ],
    hmr: {
      // HMR WebSocket must connect to the actual server host, not the subdomain
      host: 'localhost',
    },
  },
})
