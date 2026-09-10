import crypto from 'crypto'
import { connectDB } from './mongo'
import User from '@/models/User'
import { sendMagicLinkEmail } from './resend'
import { getUrl } from '@/config/app'
import { logError } from './logger'

const TOKEN_TTL_MS = 10 * 60 * 1000

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

/** Create (or upsert) user, store hashed token, email magic link */
export async function requestMagicLink(email) {
  await connectDB()
  const normalized = email.toLowerCase().trim()
  const raw = crypto.randomBytes(32).toString('hex')

  await User.findOneAndUpdate(
    { email: normalized },
    {
      $set: {
        magicTokenHash: hashToken(raw),
        magicTokenExpires: new Date(Date.now() + TOKEN_TTL_MS),
      },
      $setOnInsert: { name: normalized.split('@')[0], email: normalized },
    },
    { upsert: true }
  )

  await sendMagicLinkEmail({
    to: normalized,
    url: getUrl(`/auth/verify?token=${raw}`),
  })
}

/** Consume one-time token; returns user or null */
export async function consumeMagicToken(raw) {
  if (!raw) return null
  try {
    await connectDB()
    return await User.findOneAndUpdate(
      {
        magicTokenHash: hashToken(raw),
        magicTokenExpires: { $gt: new Date() },
      },
      { $unset: { magicTokenHash: 1, magicTokenExpires: 1 } },
      { new: true }
    )
  } catch (error) {
    logError('consumeMagicToken failed', error)
    return null
  }
}
