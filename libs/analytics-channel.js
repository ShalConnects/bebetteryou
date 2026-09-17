/** Pure attribution: a referrer and any UTM tags become one channel row. */
import { mediumRules, referrerRules } from '@/config/analytics'

function trim(value, max = 100) {
  return String(value || '').trim().slice(0, max)
}

/** Accepts a full url or a bare hostname; returns '' for anything unparseable. */
export function hostOf(value) {
  const raw = trim(value, 500)
  if (!raw) return ''
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`
  try {
    return new URL(withScheme).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

/**
 * Local browsing — `localhost`, `*.localhost`, loopback IPs. Used to keep
 * development traffic out of the dashboard.
 */
export function isLoopbackHost(value) {
  const host = hostOf(value)
  if (!host) {
    const raw = String(value || '').trim().toLowerCase()
    return raw === '::1' || raw === '[::1]'
  }
  if (host === 'localhost' || host.endsWith('.localhost')) return true
  if (host === '::1' || host === '[::1]') return true
  if (/^127(?:\.\d{1,3}){3}$/.test(host)) return true
  return false
}

export function matchReferrer(host) {
  if (!host) return null
  return referrerRules.find((rule) => rule.hosts.some((h) => host.includes(h))) || null
}

export function channelFromMedium(medium) {
  const value = trim(medium).toLowerCase()
  if (!value) return ''
  return mediumRules.find((rule) => rule.match.includes(value))?.channel || ''
}

/**
 * Hosts that count as us. Takes one url/hostname or a list, because the host a
 * visitor is actually browsing and the configured `SITE_URL` are not always the
 * same string — `www` versus bare, or localhost in development. Getting this
 * wrong files ordinary internal navigation as referral traffic.
 */
export function ownHosts(value) {
  return new Set([].concat(value ?? []).map(hostOf).filter(Boolean))
}

/**
 * UTM tags win over the referrer, because a tagged link is a deliberate claim
 * about where the visit came from. A referrer pointing back at one of our own
 * hosts is internal navigation, not a referral, so it reads as direct.
 */
export function resolveAttribution({ referrer, source, medium, campaign, siteHost } = {}) {
  const host = hostOf(referrer)
  const internal = Boolean(host) && ownHosts(siteHost).has(host)
  const rule = internal ? null : matchReferrer(host)
  const external = Boolean(host) && !internal

  const utmSource = trim(source)
  const utmChannel = channelFromMedium(medium)

  return {
    channel: utmChannel || rule?.channel || (external ? 'referral' : 'direct'),
    source: utmSource || rule?.source || (external ? host : ''),
    campaign: trim(campaign),
    referrer: external ? host : '',
  }
}
