import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      cssFileName: 'style',
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      fileName: format => format === 'es' ? 'index.js' : 'index.cjs',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['leaflet'],
      output: {
        exports: 'named',
        globals: {
          leaflet: 'L',
        },
      },
    },
  },
})
