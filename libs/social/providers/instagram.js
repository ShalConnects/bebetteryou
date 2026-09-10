/** Instagram Graph: create media container → wait ready → publish. Needs public imageUrl. */
const GRAPH = 'https://graph.facebook.com/v21.0'

async function waitForContainer(id, token, { attempts = 12, ms = 2000 } = {}) {
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(`${GRAPH}/${id}?fields=status_code&access_token=${token}`)
    const data = await res.json()
    if (data.status_code === 'FINISHED') return
    if (data.status_code === 'ERROR') {
      throw new Error(data.error?.message || 'Instagram media processing failed')
    }
    await new Promise((r) => setTimeout(r, ms))
  }
  throw new Error('Instagram media timed out before publish')
}

export async function postInstagram({ imageUrl, caption }) {
  if (!imageUrl || /localhost|127\.0\.0\.1/i.test(imageUrl)) {
    throw new Error('Instagram needs a public image URL (set SITE_URL to your live domain)')
  }

  const token = process.env.META_ACCESS_TOKEN
  const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID
  if (!token || !igUserId) throw new Error('Instagram not configured')

  const base = `${GRAPH}/${igUserId}`

  const create = await fetch(`${base}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: token }),
  })
  const created = await create.json()
  if (!create.ok || !created.id) {
    throw new Error(created.error?.message || 'Instagram media create failed')
  }

  await waitForContainer(created.id, token)

  const publish = await fetch(`${base}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: created.id, access_token: token }),
  })
  const published = await publish.json()
  if (!publish.ok || !published.id) {
    throw new Error(published.error?.message || 'Instagram publish failed')
  }
  return published
}
