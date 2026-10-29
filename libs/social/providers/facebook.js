import { resolveFacebookKeys } from '@/libs/integrations/credentials'

/** Facebook Page photo post via Graph API. Needs public imageUrl. */
export async function postFacebook({ imageUrl, caption }) {
  if (!imageUrl || /localhost|127\.0\.0\.1/i.test(imageUrl)) {
    throw new Error('Facebook needs a public image URL (set SITE_URL to your live domain)')
  }

  const { token, pageId } = await resolveFacebookKeys()
  if (!token || !pageId) throw new Error('Facebook not configured')

  const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/photos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: imageUrl, caption, access_token: token }),
  })
  const data = await res.json()
  if (!res.ok || !data.id) {
    throw new Error(data.error?.message || 'Facebook photo post failed')
  }
  return data
}
