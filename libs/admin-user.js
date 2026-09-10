import { connectDB } from '@/libs/mongo'
import User from '@/models/User'
import { adminEmail } from '@/config/admin-auth'
import { verifyPassword } from '@/libs/password'

export async function matchOwnerPassword(password) {
  const plain = process.env.ADMIN_PASSWORD
  if (plain && password === plain) return true

  const hash = process.env.ADMIN_PASSWORD_HASH
  if (!hash || !/^\$2[aby]?\$\d{2}\$/.test(hash)) return false
  return verifyPassword(password, hash)
}

/** Real Mongo user for admin — fallback id when DB unavailable (local dev). */
export async function ensureOwnerUser() {
  const email = adminEmail()
  if (!email) return null

  try {
    await connectDB()
    const user = await User.findOneAndUpdate(
      { email },
      { $set: { hasAccess: true }, $setOnInsert: { name: 'Admin', email } },
      { upsert: true, new: true }
    )
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      hasAccess: true,
    }
  } catch {
    return { id: 'admin-owner', email, name: 'Admin', hasAccess: true }
  }
}

export function isDbUserId(id) {
  return Boolean(id && id !== 'admin-owner' && /^[a-f\d]{24}$/i.test(id))
}
