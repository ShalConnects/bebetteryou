import fs from 'fs'
import { execSync } from 'child_process'

const raw = fs.readFileSync('.env.local', 'utf8')
const vars = new Map()

for (const line of raw.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const i = trimmed.indexOf('=')
  if (i < 1) continue
  const key = trimmed.slice(0, i).trim()
  let val = trimmed.slice(i + 1).trim()
  if (val) vars.set(key, val)
}

for (const [key, val] of vars) {
  for (const env of ['production', 'preview', 'development']) {
    try {
      execSync(`npx vercel env rm ${key} ${env} --yes`, { stdio: 'ignore' })
    } catch {
      /* not set yet */
    }
    execSync(`npx vercel env add ${key} ${env}`, {
      input: val,
      stdio: ['pipe', 'inherit', 'inherit'],
    })
    console.log(`set ${key} (${env})`)
  }
}

console.log(`Pushed ${vars.size} variables to Vercel`)
