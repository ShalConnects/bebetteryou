import { brand } from '@/config/site'
import { resolveLinkedInKeys } from '@/libs/integrations/credentials'

/** LinkedIn image (imageBuffer) or MP4 (video) share via Assets + UGC Posts (company page or personal profile). */
export async function postLinkedIn({ caption, imageBuffer, video }) {
  const file = video || imageBuffer
  if (!file?.length) throw new Error('Image file missing')
  const kind = video ? 'video' : 'image'

  const { token, orgId, memberId } = await resolveLinkedInKeys()
  if (!token || (!orgId && !memberId)) throw new Error('LinkedIn not configured')
  const owner = orgId ? `urn:li:organization:${orgId}` : `urn:li:person:${memberId}`
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Restli-Protocol-Version': '2.0.0',
  }

  const reg = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: [`urn:li:digitalmediaRecipe:feedshare-${kind}`],
        owner,
        serviceRelationships: [
          { relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' },
        ],
      },
    }),
  })
  const regJson = await reg.json()
  const uploadUrl =
    regJson?.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']
      ?.uploadUrl
  const asset = regJson?.value?.asset
  if (!reg.ok || !uploadUrl || !asset) {
    throw new Error(regJson.message || 'LinkedIn upload register failed')
  }

  const up = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': video ? 'video/mp4' : 'image/jpeg' },
    body: file,
  })
  if (!up.ok) throw new Error(`LinkedIn ${kind} upload failed`)
  if (video) await waitForAsset(asset, headers)

  const post = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      author: owner,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: caption },
          shareMediaCategory: kind.toUpperCase(),
          media: [
            {
              status: 'READY',
              media: asset,
              title: { text: brand.name },
            },
          ],
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }),
  })
  const posted = await post.json().catch(() => ({}))
  if (!post.ok) throw new Error(posted.message || 'LinkedIn post failed')
  /** Create often returns empty body; URN is in `x-restli-id`. */
  const urn = String(post.headers.get('x-restli-id') || posted.id || '').trim()
  return {
    id: urn || null,
    url: urn ? `https://www.linkedin.com/feed/update/${urn}` : null,
  }
}

/** Videos must finish processing before they can be shared. */
async function waitForAsset(asset, headers) {
  for (let i = 0; i < 40; i++) {
    const data = await fetch(`https://api.linkedin.com/v2/assets/${asset.split(':').pop()}`, { headers }).then((r) => r.json())
    const status = data?.recipes?.[0]?.status
    if (status === 'AVAILABLE') return
    if (status === 'PROCESSING_FAILED') throw new Error('LinkedIn video processing failed')
    await new Promise((r) => setTimeout(r, 3000))
  }
  throw new Error('LinkedIn video timed out')
}
