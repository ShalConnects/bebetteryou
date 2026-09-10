import { assertEnv } from './env.mjs'

try {
  assertEnv()
} catch (error) {
  if (process.env.NODE_ENV === 'production') throw error
  console.warn('[env]', error.message)
}
