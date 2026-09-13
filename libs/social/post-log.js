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
  }
}

export function defaultSelected(networks, posts) {
  return networks.filter((n) => n.ready && !posts?.[n.id]?.ok).map((n) => n.id)
}

export function alreadyPosted(selected, posts) {
  return selected.filter((id) => posts?.[id]?.ok)
}
