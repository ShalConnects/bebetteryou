/**
 * Print Threads user id for THREADS_USER_ID.
 * Needs THREADS_ACCESS_TOKEN in .env.local (threads_basic, threads_content_publish).
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

const token = process.env.THREADS_ACCESS_TOKEN
if (!token) {
  console.error('Set THREADS_ACCESS_TOKEN in .env.local')
  process.exit(1)
}

const res = await fetch(
  `https://graph.threads.net/v1.0/me?fields=id,username&access_token=${encodeURIComponent(token)}`
)
const data = await res.json()
if (!res.ok || !data.id) {
  console.error(data.error?.message || data.message || res.status)
  process.exit(1)
}

console.log(`THREADS_USER_ID=${data.id}`)
console.log(`username=@${data.username || ''}`)
