/** Threads: create container → wait ready → publish. Needs a public imageUrl. */
const GRAPH = 'https://graph.threads.net/v1.0'

export function threadsKeys() {
  return {
    token: process.env.THREADS_ACCESS_TOKEN,
    userId: process.env.THREADS_USER_ID,
  }
}

export function hasThreadsKeys(keys = threadsKeys()) {
  return Boolean(keys.token && keys.userId)
}

/** Threads captions cap at 500 characters (emoji count as UTF-8 bytes). */
export function clipThreadsText(text, max = 500) {
  const s = String(text || '').trim()
  if (s.length <= max) return s
  return `${s.slice(0, max - 1).trimEnd()}…`
}

async function waitForContainer(id, token, { attempts = 12, ms = 2000 } = {}) {
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(`${GRAPH}/${id}?fields=status,error_message&access_token=${token}`)
    const data = await res.json()
    if (data.status === 'FINISHED') return
    if (data.status === 'ERROR' || data.status === 'EXPIRED') {
      throw new Error(data.error_message || data.error?.message || 'Threads media processing failed')
    }
    await new Promise((r) => setTimeout(r, ms))
  }
  throw new Error('Threads media timed out before publish')
}

export async function postThreads({ imageUrl, caption, replyToId }) {
  if (!imageUrl || /localhost|127\.0\.0\.1/i.test(imageUrl)) {
    throw new Error('Threads needs a public image URL (set SITE_URL to your live domain)')
  }

  const { token, userId } = threadsKeys()
  if (!hasThreadsKeys({ token, userId })) throw new Error('Threads not configured')

  const text = clipThreadsText(caption)
  const payload = {
    media_type: 'IMAGE',
    image_url: imageUrl,
    text,
    access_token: token,
  }
  if (replyToId) payload.reply_to_id = replyToId

  const create = await fetch(`${GRAPH}/${userId}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const created = await create.json()
  if (!create.ok || !created.id) {
    throw new Error(created.error?.message || 'Threads media create failed')
  }

  await waitForContainer(created.id, token)

  const publish = await fetch(`${GRAPH}/${userId}/threads_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: created.id, access_token: token }),
  })
  const published = await publish.json()
  if (!publish.ok || !published.id) {
    throw new Error(published.error?.message || 'Threads publish failed')
  }

  const permalink = await fetch(
    `${GRAPH}/${published.id}?fields=permalink&access_token=${token}`
  ).then((r) => r.json().catch(() => ({})))

  return {
    id: published.id,
    url: permalink.permalink || null,
  }
}

/** Root post + replies (each reply_to_id = root). Sequential — API needs published ids. */
export async function postThreadsThread(items = []) {
  const posts = items.filter((item) => item?.imageUrl)
  if (!posts.length) throw new Error('No Threads items')

  const ids = []
  let rootId = null
  let rootUrl = null

  for (let i = 0; i < posts.length; i++) {
    const posted = await postThreads({
      imageUrl: posts[i].imageUrl,
      caption: posts[i].caption,
      replyToId: rootId || undefined,
    })
    ids.push(posted.id)
    if (!rootId) {
      rootId = posted.id
      rootUrl = posted.url
    }
  }

  return { id: rootId, url: rootUrl, ids }
}
