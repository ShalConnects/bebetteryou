/** Canonical site origin from env (no trailing slash). */
export function getSiteUrl() {
  return (process.env['SITE_URL'] || process.env['NEXTAUTH_URL'] || 'http://localhost:3000').replace(
    /\/$/,
    ''
  )
}

/** Quote-card footer host — `www.` apex, no protocol (matches legacy cards). */
export function getSiteLabel() {
  try {
    const host = new URL(getSiteUrl()).host
    if (host === 'localhost' || host.startsWith('localhost:') || host.startsWith('www.')) return host
    return `www.${host}`
  } catch {
    return getSiteUrl()
  }
}
