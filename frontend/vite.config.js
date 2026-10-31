import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Porta própria para rodar junto com outros projetos (o padrão 5173 costuma estar ocupado).
    port: 5180,
    strictPort: true,
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY || "http://localhost:3010",
        changeOrigin: true,
      },
    },
  },
})
