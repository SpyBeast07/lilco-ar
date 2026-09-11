import { existsSync, readFileSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

const html = readFileSync('dist/index.html', 'utf8')
const entryMatch = html.match(/<script[^>]+src="([^"]+\.js)"/)

if (!entryMatch) {
  throw new Error('Could not find the production entry script in dist/index.html')
}

const entryPath = `dist/${entryMatch[1].replace(/^\.\//, '')}`
const entryBytes = readFileSync(entryPath)
const gzipBytes = gzipSync(entryBytes).byteLength
const maxEntryGzipBytes = 80 * 1024

if (gzipBytes > maxEntryGzipBytes) {
  throw new Error(`Initial JS is ${(gzipBytes / 1024).toFixed(1)} KiB gzip; budget is 80 KiB`)
}

const requiredOfflineAssets = ['dist/demo-experience.json', 'dist/demo-experience.mind']
for (const assetPath of requiredOfflineAssets) {
  if (!statSync(assetPath).size) throw new Error(`Required offline scanner asset is missing: ${assetPath}`)
}

const config = JSON.parse(readFileSync('public/demo-experience.json', 'utf8'))
for (const experience of config) {
  if (existsSync(`dist${experience.targetImageUrl}`)) {
    throw new Error(`Compiled target source leaked into the production package: ${experience.targetImageUrl}`)
  }
}

console.log(`Build budgets passed: initial JS ${(gzipBytes / 1024).toFixed(1)} KiB gzip`)
