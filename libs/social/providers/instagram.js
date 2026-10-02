/** Instagram Graph: create media container → wait ready → publish. Needs public imageUrl. */
const GRAPH = 'https://graph.facebook.com/v21.0'

function igCredentials() {
  const token = process.env.META_ACCESS_TOKEN
  const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID
  if (!token || !igUserId) throw new Error('Instagram not configured')
  return { token, igUserId, base: `${GRAPH}/${igUserId}` }
}

function assertPublicImageUrl(imageUrl) {
  if (!imageUrl || /localhost|127\.0\.0\.1/i.test(imageUrl)) {
    throw new Error('Instagram needs a public image URL (set SITE_URL to your live domain)')
  }
}

async function waitForContainer(id, token, { attempts = 20, ms = 1500 } = {}) {
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

async function publishContainer(base, token, creationId) {
  const publish = await fetch(`${base}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: creationId, access_token: token }),
  })
  const published = await publish.json()
  if (!publish.ok || !published.id) {
    throw new Error(published.error?.message || 'Instagram publish failed')
  }
  return published
}

export async function postInstagram({ imageUrl, caption }) {
  assertPublicImageUrl(imageUrl)
  const { token, base } = igCredentials()

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
  return publishContainer(base, token, created.id)
}

/**
 * Instagram carousel (2–10 slides). One public image URL per slide.
 * Single URL falls back to a normal feed post.
 */
export async function postInstagramCarousel({ imageUrls = [], caption }) {
  const urls = [...new Set((imageUrls || []).map(String).filter(Boolean))]
  if (!urls.length) throw new Error('No Instagram carousel images')
  urls.forEach(assertPublicImageUrl)

  if (urls.length === 1) return postInstagram({ imageUrl: urls[0], caption })
  if (urls.length > 10) throw new Error('Instagram carousels support at most 10 images')

  const { token, base } = igCredentials()

  const childIds = []
  for (const imageUrl of urls) {
    const create = await fetch(`${base}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        is_carousel_item: true,
        access_token: token,
      }),
    })
    const created = await create.json()
    if (!create.ok || !created.id) {
      throw new Error(created.error?.message || 'Instagram carousel item create failed')
    }
    await waitForContainer(created.id, token)
    childIds.push(created.id)
  }

  const album = await fetch(`${base}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      media_type: 'CAROUSEL',
      children: childIds.join(','),
      caption: caption || '',
      access_token: token,
    }),
  })
  const albumCreated = await album.json()
  if (!album.ok || !albumCreated.id) {
    throw new Error(albumCreated.error?.message || 'Instagram carousel create failed')
  }

  await waitForContainer(albumCreated.id, token)
  return publishContainer(base, token, albumCreated.id)
}
