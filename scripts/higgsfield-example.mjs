/**
 * Billable smoke test: one 5-second Seedance 2.5 clip. Run: node scripts/higgsfield-example.mjs
 * Reads HF_CREDENTIALS from .env.local (git-ignored); the value is never printed.
 */
import nextEnv from '@next/env'
import { generateVideo } from '../libs/higgsfield.js'

nextEnv.loadEnvConfig(process.cwd())
if (!process.env.HF_CREDENTIALS) {
  console.error('HF_CREDENTIALS is not set in .env.local (format key-id:key-secret).')
  process.exit(1)
}

try {
  const { url, requestId } = await generateVideo('bytedance/seedance-2.5/text-to-video', {
    prompt: 'A cinematic scene at sunset',
    duration: 5,
    resolution: '720p',
    aspect_ratio: '16:9',
  })
  console.log('Request:', requestId)
  console.log('Video URL:', url)
} catch (error) {
  console.error('Higgsfield request did not succeed:', error.message)
  process.exit(1)
}
