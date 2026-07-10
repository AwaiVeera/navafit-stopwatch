import fs from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()
const publicDir = path.join(projectRoot, 'public')
const targetPath = path.join(publicDir, 'favicon.png')

const sourceCandidates = [
  path.join(projectRoot, '..', 'Assets', 'favicon.png'),
  path.join(projectRoot, '..', 'Assets', 'Font.png'),
  path.join(projectRoot, '..', 'Assets', 'font.png'),
  path.join(projectRoot, 'Assets', 'favicon.png'),
  path.join(projectRoot, 'Assets', 'Font.png'),
  path.join(projectRoot, 'Assets', 'font.png'),
]

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true })
}

if (fs.existsSync(targetPath)) {
  console.log('Favicon asset already present at public/favicon.png')
  process.exit(0)
}

const sourcePath = sourceCandidates.find((candidate) => fs.existsSync(candidate))

if (!sourcePath) {
  console.log('Favicon source not found in known asset folders.')
  console.log('Ship /public/favicon.png (plus favicon-32.png + apple-touch-icon.png) manually before build.')
  process.exit(0)
}

fs.copyFileSync(sourcePath, targetPath)
console.log(`Copied favicon asset from ${sourcePath} to ${targetPath}`)
