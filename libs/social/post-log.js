/** Last attempt wins for ok/error; a failure keeps the last success URL. */
export function mergePostRecord(prev, result, at = new Date()) {
  const ok = Boolean(result.ok)
  return {
    slug: result.slug,
    network: result.id,
    ok,
    at,
    error: ok ? '' : String(result.error || 'Failed'),
    url: ok ? result.url || prev?.url || '' : prev?.url || '',
    privacy: ok ? result.privacy || '' : prev?.privacy || '',
    channel: ok ? result.channel || '' : prev?.channel || '',
    manual: ok ? Boolean(result.manual) : Boolean(prev?.manual),
  }
}

/** Ready for API post, or pending (e.g. X credits) so admin can mark manual posts. */
export function canSelectNetwork(n) {
  return Boolean(n?.ready || n?.pending)
}

export function defaultSelected(networks, posts) {
  return networks.filter((n) => canSelectNetwork(n) && !posts?.[n.id]?.ok).map((n) => n.id)
}

export function alreadyPosted(selected, posts) {
  return selected.filter((id) => posts?.[id]?.ok)
}

/** Cron / schedule: only networks that are not already ok in the post log. */
export function networksNeedingPost(requested, posts) {
  return [...new Set((requested || []).map(String).filter(Boolean))].filter((id) => !posts?.[id]?.ok)
}

/** Build ok results for admin “I posted this myself” (no provider call). */
export function manualPostResults(slug, networkIds, labels = {}) {
  const key = String(slug || '').trim()
  return [...new Set((networkIds || []).map(String).filter(Boolean))].map((id) => ({
    id,
    label: labels[id] || id,
    slug: key,
    ok: true,
    manual: true,
    url: null,
    error: '',
  }))
}
