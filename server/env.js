import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(dirname, '..', '.env')

function parseEnvLine(line) {
  const trimmedLine = line.trim()

  if (!trimmedLine || trimmedLine.startsWith('#')) return null

  const separatorIndex = trimmedLine.indexOf('=')
  if (separatorIndex === -1) return null

  const key = trimmedLine.slice(0, separatorIndex).trim()
  const rawValue = trimmedLine.slice(separatorIndex + 1).trim()
  const value = rawValue.replace(/^['"]|['"]$/g, '')

  return key ? [key, value] : null
}

if (existsSync(envPath)) {
  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/)

  for (const line of lines) {
    const parsedLine = parseEnvLine(line)
    if (!parsedLine) continue

    const [key, value] = parsedLine
    process.env[key] ||= value
  }
}
