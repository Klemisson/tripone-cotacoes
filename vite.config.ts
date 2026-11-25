import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// SINGLE=1 gera um único index.html (para pré-visualização/compartilhamento).
export default defineConfig({
  plugins: [react(), ...(process.env.SINGLE ? [viteSingleFile()] : [])],
})
