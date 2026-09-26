import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const assetsDir = path.join(rootDir, 'assets')
mkdirSync(assetsDir, { recursive: true })

await sharp(path.join(assetsDir, 'icon-source.svg')).resize(1024, 1024).png().toFile(path.join(assetsDir, 'icon.png'))

await sharp(path.join(assetsDir, 'splash-source.svg'))
  .resize(2732, 2732)
  .png()
  .toFile(path.join(assetsDir, 'splash.png'))

await sharp(path.join(assetsDir, 'splash-source.svg'))
  .resize(2732, 2732)
  .png()
  .toFile(path.join(assetsDir, 'splash-dark.png'))

console.log('아이콘/스플래시 소스 PNG 생성 완료: assets/icon.png, assets/splash.png, assets/splash-dark.png')
