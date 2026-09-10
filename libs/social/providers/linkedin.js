import { brand } from '@/config/site'

/** LinkedIn image share via Assets + UGC Posts (company page or personal profile). */
export async function postLinkedIn({ caption, imageBuffer }) {
  if (!imageBuffer?.length) throw new Error('Image file missing')

  const token = process.env.LINKEDIN_ACCESS_TOKEN
  const orgId = process.env.LINKEDIN_ORG_ID
  const memberId = process.env.LINKEDIN_MEMBER_ID
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
        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
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
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/jpeg' },
    body: imageBuffer,
  })
  if (!up.ok) throw new Error('LinkedIn image upload failed')

  const post = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      author: owner,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: caption },
          shareMediaCategory: 'IMAGE',
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
  return posted
}
