/**
 * List Pinterest boards so you can set PINTEREST_BOARD_ID.
 * Needs PINTEREST_ACCESS_TOKEN in .env.local (pins:write boards:read boards:write).
 */
import fs from 'fs'
import path from 'path'

function loadEnvLocal() {
  const file = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const i = trimmed.indexOf('=')
    if (i < 1) continue
    const key = trimmed.slice(0, i).trim()
    let val = trimmed.slice(i + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnvLocal()

const token = process.env.PINTEREST_ACCESS_TOKEN
if (!token) {
  console.error('Set PINTEREST_ACCESS_TOKEN in .env.local')
  process.exit(1)
}

const sandbox = process.env.PINTEREST_SANDBOX
const apiBase =
  sandbox === '1' || sandbox === 'true'
    ? 'https://api-sandbox.pinterest.com'
    : 'https://api.pinterest.com'

const res = await fetch(`${apiBase}/v5/boards?page_size=50`, {
  headers: { Authorization: `Bearer ${token}` },
})
const data = await res.json()
if (!res.ok) {
  console.error(data.message || data.error || res.status)
  process.exit(1)
}

const boards = data.items || []
if (!boards.length) {
  console.log('No boards. Create one at pinterest.com, then rerun.')
  process.exit(0)
}

console.log('Paste one id into .env.local as PINTEREST_BOARD_ID:\n')
for (const b of boards) {
  console.log(`${b.id}  ${b.name}`)
}
