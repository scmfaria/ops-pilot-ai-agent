import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { resolveBasePath } from './base-path.ts'

// Base pública padrão é /opspilot/ (spec 003). Deploys como GitHub Pages
// sobrescrevem via VITE_BASE (spec 004), ex.: /ops-pilot-ai-agent/.
export default defineConfig({
  base: resolveBasePath(process.env.VITE_BASE),
  plugins: [react()],
  server: { host: '0.0.0.0' },
})
