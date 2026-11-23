import { config, higgsfield } from '@higgsfield/client/v2'

/**
 * Server-only Higgsfield calls. Credentials come from HF_CREDENTIALS ("key-id:key-secret").
 * The v2 client returns the raw API response ({ status, request_id, video }), not a JobSet.
 */
function client() {
  config({ credentials: process.env.HF_CREDENTIALS })
  return higgsfield
}

/** Queue a generation without waiting. Returns the request id. */
export async function submitGeneration(model, input) {
  const res = await client().subscribe(model, { input, withPolling: false })
  if (!res.request_id) throw new Error('Higgsfield did not return a request id')
  return res.request_id
}

/** `{ status, url }` — status is queued, in_progress, completed, failed, nsfw or canceled. */
export async function generationStatus(requestId) {
  const res = await fetch(`https://api.higgsfield.ai/requests/${encodeURIComponent(requestId)}/status`, {
    headers: { Authorization: `Key ${process.env.HF_CREDENTIALS}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || `Higgsfield status failed (${res.status})`)
  return { status: data.status, url: data.video?.url || '' }
}

/** Run one generation and wait for it. Throws unless it completed with a video. */
export async function generateVideo(model, input) {
  const res = await client().subscribe(model, { input, withPolling: true })
  const requestId = res.request_id
  if (res.status === 'nsfw') throw new Error(`Rejected by moderation, credits refunded (${requestId})`)
  if (res.status === 'failed') throw new Error(`Generation failed, credits refunded (${requestId})`)
  if (res.status !== 'completed' || !res.video?.url) {
    throw new Error(`Request ${requestId} ended as "${res.status}" without a video`)
  }
  return { url: res.video.url, requestId }
}
