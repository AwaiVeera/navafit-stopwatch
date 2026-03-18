import fs from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()
const publicDir = path.join(projectRoot, 'public')
const targetPath = path.join(publicDir, 'Font.png')

const sourceCandidates = [
  path.join(projectRoot, '..', 'Assets', 'Font.png'),
  path.join(projectRoot, '..', 'Assets', 'font.png'),
  path.join(projectRoot, 'Assets', 'Font.png'),
  path.join(projectRoot, 'Assets', 'font.png'),
]

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true })
}

if (fs.existsSync(targetPath)) {
  console.log('Font asset already present at public/Font.png')
  process.exit(0)
}

const sourcePath = sourceCandidates.find((candidate) => fs.existsSync(candidate))

if (!sourcePath) {
  console.log('Font.png not found in known asset folders.')
  console.log('Fallback will use public/font-fallback.svg automatically.')
  process.exit(0)
}

fs.copyFileSync(sourcePath, targetPath)
console.log(`Copied font hero asset from ${sourcePath} to ${targetPath}`)
