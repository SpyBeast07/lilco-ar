import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

const defaultExperiences = JSON.parse(readFileSync(new URL('./public/demo-experience.json', import.meta.url)))
const compiledTargetSources = defaultExperiences
  .map((experience) => experience.targetImageUrl)
  .filter((url) => typeof url === 'string' && url.startsWith('/'))
const unreferencedDemoAssets = ["/Schrodinger's Cat.png", '/photoelectric2.glb']

function excludeCompiledTargetSources() {
  return {
    name: 'exclude-compiled-target-sources',
    closeBundle() {
      for (const assetUrl of [...compiledTargetSources, ...unreferencedDemoAssets]) {
        rmSync(resolve('dist', assetUrl.slice(1)), { force: true })
      }
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), excludeCompiledTargetSources()],
  build: {
    chunkSizeWarningLimit: 600,
  },
  optimizeDeps: {
    exclude: ['mind-ar']
  },
  server: {
    historyApiFallback: true
  },
  preview: {
    historyApiFallback: true
  }
})
