import { ray, rayPrompt } from '@/config/ray'
import { saveAsset } from '@/libs/asset-store'
import { generationStatus, submitGeneration } from '@/libs/higgsfield'
import { logInfo } from '@/libs/logger'
import { getSiteUrl } from '@/libs/site-url'
import { readQuotes } from '@/libs/quotes-store'
import { quoteCaption, readyNetworks } from '@/libs/social'
import { recordPost } from '@/libs/social/post-store'
import { postFacebook } from '@/libs/social/providers/facebook'
import { postInstagramReel } from '@/libs/social/providers/instagram'
import { postPinterest } from '@/libs/social/providers/pinterest'
import { postThreads } from '@/libs/social/providers/threads'
import { postYouTube } from '@/libs/social/providers/youtube'
import { listAllSchedules } from '@/libs/social/schedule-store'
import { HOUR, SENT, rayKey, raySetting, videoCost, weekSpend } from './plan'
import { readRays, saveRay } from './store'
import { renderRayVideo } from './render'

/** Save a script; `approve` queues it (and sends it now if its slot is close). */
export async function saveRayScript({ slug, hook, script, approve }, now = new Date()) {
  const row = (await readRays({ slug }))[slug]
  if (SENT.includes(row?.status)) throw new Error('Already sent to Higgsfield — it can no longer be edited')
  const schedule = (await listAllSchedules()).find((s) => s.slug === slug && s.status === 'pending')
  if (!schedule) throw new Error('This card has no upcoming post date')
  if (approve && !String(script || '').trim()) throw new Error('Write the script first')
  const saved = await saveRay(slug, {
    hook: String(hook || '').trim(),
    script: String(script || '').trim(),
    postAt: new Date(schedule.runAt),
    status: approve ? 'approved' : 'draft',
    error: '',
  })
  return approve ? { ...saved, ...(await submitDue(now))[slug] } : saved
}

/** Send approved scripts whose slot is within the lead time, while the week's cap allows. */
export async function submitDue(now = new Date()) {
  const rows = await readRays()
  let spend = weekSpend(rows, now)
  const sent = {}
  const due = Object.values(rows)
    .filter((r) => r.status === 'approved' && new Date(r.postAt) - now < ray.leadHours * HOUR)
    .sort((a, b) => new Date(a.postAt) - new Date(b.postAt))
  for (const r of due) {
    if (spend + videoCost() > ray.weeklyCapUsd) {
      sent[r.slug] = await saveRay(r.slug, { error: `Waiting: this week's $${ray.weeklyCapUsd} cap is used` })
      continue
    }
    const requestId = await submitGeneration(ray.model, {
      prompt: rayPrompt({ script: r.script, setting: raySetting(r.slug) }),
      image_urls: [`${getSiteUrl()}${ray.portrait}`],
      duration: ray.seconds,
      resolution: ray.resolution,
      aspect_ratio: '9:16',
      generate_audio: true,
    })
    spend += videoCost()
    sent[r.slug] = await saveRay(r.slug, { status: 'generating', requestId, costUsd: videoCost(), submittedAt: now, error: '' })
  }
  return sent
}

/** Pick up finished videos: caption, add music, store on Blob. */
async function collect(rows, quotes) {
  for (const r of Object.values(rows).filter((x) => x.status === 'generating')) {
    const { status, url } = await generationStatus(r.requestId)
    if (['failed', 'nsfw', 'canceled'].includes(status)) {
      await saveRay(r.slug, { status: 'failed', costUsd: 0, error: `Higgsfield: ${status} (credits refunded)` })
      continue
    }
    if (status !== 'completed' || !url) continue
    const raw = Buffer.from(await (await fetch(url)).arrayBuffer())
    const quote = quotes.find((q) => q.slug === r.slug)
    const { video, poster } = await renderRayVideo(raw, { quote, hook: r.hook, script: r.script })
    const [videoUrl] = await Promise.all([
      saveAsset({ dir: 'ray', filename: `${r.slug}.mp4`, buffer: video, contentType: 'video/mp4' }),
      saveAsset({ dir: 'ray', filename: `${r.slug}.jpg`, buffer: poster, contentType: 'image/jpeg' }),
    ])
    rows[r.slug] = await saveRay(r.slug, { status: 'ready', videoUrl, error: '' })
  }
}

const fetchBuffer = async (url) => Buffer.from(await (await fetch(url)).arrayBuffer())

/** One poster per network; each gets the public MP4, its poster JPEG and the caption. */
const POSTERS = {
  youtube: async ({ quote, caption, videoUrl, posterUrl }) =>
    postYouTube({ quote, caption, video: await fetchBuffer(videoUrl), poster: await fetchBuffer(posterUrl), synthetic: true }),
  instagram: ({ caption, videoUrl }) => postInstagramReel({ videoUrl, caption }),
  facebook: ({ caption, videoUrl }) => postFacebook({ videoUrl, caption }),
  threads: ({ caption, videoUrl }) => postThreads({ videoUrl, caption }),
  pinterest: async ({ quote, caption, videoUrl, posterUrl }) =>
    postPinterest({ quote, caption, video: await fetchBuffer(videoUrl), coverUrl: posterUrl }),
}

/** Post ready videos whose slot has come to every connected network in `ray.networks` (each once). */
async function postDue(rows, quotes, now) {
  const ready = new Set((await readyNetworks()).filter((n) => n.ready).map((n) => n.id))
  for (const r of Object.values(rows).filter((x) => x.status === 'ready' && new Date(x.postAt) - now < HOUR)) {
    const quote = quotes.find((q) => q.slug === r.slug)
    const done = (r.results || []).filter((x) => x.ok)
    const todo = ray.networks.filter((n) => ready.has(n) && !done.some((x) => x.id === n))
    const fresh = await Promise.all(
      todo.map(async (id) => {
        const result = { id, ok: false }
        try {
          const caption = `${await quoteCaption(quote, id)}\n\n${ray.aiNote}`
          const posted = await POSTERS[id]({ quote, caption, videoUrl: r.videoUrl, posterUrl: r.videoUrl.replace(/\.mp4$/, '.jpg') })
          Object.assign(result, { ok: true, url: posted?.url || posted?.permalink || '' })
        } catch (err) {
          result.error = err.message || 'Failed'
        }
        await recordPost(rayKey(r.slug), result)
        return result
      })
    )
    const results = [...done, ...fresh]
    const failed = results.filter((x) => !x.ok)
    await saveRay(r.slug, {
      results,
      status: results.some((x) => x.ok) ? 'posted' : 'ready',
      error: failed.map((x) => `${x.id}: ${x.error}`).join('; '),
    })
  }
}

/** Cron: collect finished videos, post the ones due, then send the next approved scripts. */
export async function runRay(now = new Date()) {
  if (!process.env.HF_CREDENTIALS) return { skipped: true, reason: 'HF_CREDENTIALS missing' }
  const [rows, quotes] = await Promise.all([readRays(), readQuotes()])
  await collect(rows, quotes)
  await postDue(rows, quotes, now)
  const sent = Object.keys(await submitDue(now))
  logInfo('Ray videos run', { sent })
  return { ok: true, sent }
}
