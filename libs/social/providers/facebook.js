import { resolveFacebookKeys } from '@/libs/integrations/credentials'

/** Facebook Page photo (imageUrl) or video (videoUrl) post via Graph API. Needs a public URL. */
export async function postFacebook({ imageUrl, videoUrl, caption }) {
  const url = videoUrl || imageUrl
  if (!url || /localhost|127\.0\.0\.1/i.test(url)) {
    throw new Error('Facebook needs a public media URL (set SITE_URL to your live domain)')
  }

  const { token, pageId } = await resolveFacebookKeys()
  if (!token || !pageId) throw new Error('Facebook not configured')

  const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/${videoUrl ? 'videos' : 'photos'}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      videoUrl ? { file_url: videoUrl, description: caption, access_token: token } : { url, caption, access_token: token }
    ),
  })
  const data = await res.json()
  if (!res.ok || !data.id) {
    throw new Error(data.error?.message || 'Facebook post failed')
  }
  return data
}
