import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../docs',
    emptyOutDir: true,
  },
  plugins: [
    tailwindcss(),
  ],
  base: '/Butter-Analysis/',
})