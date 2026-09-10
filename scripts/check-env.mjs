import { validateEnv } from '../libs/env.mjs'

const { missing, warnings } = validateEnv()

if (missing.length) {
  console.error('Missing required:', missing.join(', '))
  process.exit(1)
}

if (warnings.length) {
  console.warn('Warnings:')
  for (const w of warnings) console.warn(`  - ${w}`)
} else {
  console.log('Env OK')
}

process.exit(0)
