import fs from 'fs'
import path from 'path'
import { mongoUri } from '@/libs/mongo-uri'

const dataDir = path.join(process.cwd(), 'data/integrations')

function localPath(network) {
  return path.join(dataDir, `${network}.json`)
}

function readLocal(network) {
  try {
    return JSON.parse(fs.readFileSync(localPath(network), 'utf8'))
  } catch {
    return null
  }
}

function writeLocal(network, doc) {
  fs.mkdirSync(dataDir, { recursive: true })
  fs.writeFileSync(
    localPath(network),
    JSON.stringify({ ...doc, updatedAt: new Date().toISOString() }, null, 2)
  )
}

function publicDoc(doc) {
  if (!doc) return null
  return {
    network: doc.network,
    hasAccessToken: Boolean(doc.accessToken),
    hasRefreshToken: Boolean(doc.refreshToken),
    extras: doc.extras && typeof doc.extras === 'object' ? { ...doc.extras } : {},
    lastError: doc.lastError || '',
    lastOkAt: doc.lastOkAt || null,
    updatedAt: doc.updatedAt || null,
  }
}

async function readRemote(network) {
  if (!mongoUri()) return null
  try {
    const { connectDB } = await import('@/libs/mongo')
    const SocialAuth = (await import('@/models/SocialAuth')).default
    await connectDB()
    return SocialAuth.findOne({ network }).lean()
  } catch {
    return null
  }
}

/** Full credential doc (includes secrets). Server-only. */
export async function getIntegration(network) {
  const key = String(network || '').trim()
  if (!key) return null
  const remote = await readRemote(key)
  if (remote) return remote
  const local = readLocal(key)
  if (local) return { network: key, ...local }
  return null
}

export async function getIntegrationPublic(network) {
  return publicDoc(await getIntegration(network))
}

/**
 * Upsert credentials for a network.
 * @param {string} network
 * @param {{ accessToken?: string, refreshToken?: string, extras?: object, lastError?: string, lastOkAt?: Date|null }} patch
 */
export async function saveIntegration(network, patch = {}) {
  const key = String(network || '').trim()
  if (!key) throw new Error('Network required')

  const existing = (await getIntegration(key)) || {}
  const next = {
    network: key,
    accessToken:
      patch.accessToken !== undefined
        ? String(patch.accessToken || '').trim()
        : existing.accessToken || '',
    refreshToken:
      patch.refreshToken !== undefined
        ? String(patch.refreshToken || '').trim()
        : existing.refreshToken || '',
    extras: {
      ...(existing.extras && typeof existing.extras === 'object' ? existing.extras : {}),
      ...(patch.extras && typeof patch.extras === 'object' ? patch.extras : {}),
    },
    lastError: patch.lastError !== undefined ? String(patch.lastError || '') : existing.lastError || '',
    lastOkAt: patch.lastOkAt !== undefined ? patch.lastOkAt : existing.lastOkAt || null,
  }

  if (process.env.VERCEL && !mongoUri()) {
    throw new Error('MONGODB_URI required to save integrations on Vercel')
  }
  if (!process.env.VERCEL) writeLocal(key, next)

  if (mongoUri()) {
    const { connectDB } = await import('@/libs/mongo')
    const SocialAuth = (await import('@/models/SocialAuth')).default
    await connectDB()
    await SocialAuth.findOneAndUpdate(
      { network: key },
      {
        $set: {
          accessToken: next.accessToken,
          refreshToken: next.refreshToken,
          extras: next.extras,
          lastError: next.lastError,
          lastOkAt: next.lastOkAt,
        },
      },
      { upsert: true, setDefaultsOnInsert: true }
    )
  }

  return publicDoc(next)
}

export async function clearIntegration(network) {
  const key = String(network || '').trim()
  if (!key) return
  try {
    fs.unlinkSync(localPath(key))
  } catch {
    /* ignore */
  }
  if (!mongoUri()) return
  const { connectDB } = await import('@/libs/mongo')
  const SocialAuth = (await import('@/models/SocialAuth')).default
  await connectDB()
  await SocialAuth.deleteOne({ network: key })
}

export async function markIntegrationOk(network) {
  return saveIntegration(network, { lastError: '', lastOkAt: new Date() })
}

export async function markIntegrationError(network, error) {
  return saveIntegration(network, { lastError: String(error || 'Failed') })
}
