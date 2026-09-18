'use client'

/**
 * Browser side of the analytics pipeline. Sends beacons to /api/track and holds
 * first-touch attribution for the visit.
 *
 * Attribution lives in `sessionStorage`, not a cookie, so the referrer that
 * started the visit still credits a download three pages later without anything
 * being stored across visits — no cookie banner, nothing to consent to.
 */
import { analyticsEvents } from '@/config/analytics'
import { appConfig } from '@/config/app'
import { isLoopbackHost } from '@/libs/analytics-channel'

const STORE_KEY = 'bby:attribution'
const ENDPOINT = '/api/track'

function enabled() {
  if (typeof window === 'undefined') return false
  if (!appConfig.features.enableAnalytics) return false
  if (isLoopbackHost(window.location.hostname)) return false
  /** Honour the browser's opt-out rather than argue with it. */
  return navigator.doNotTrack !== '1' && window.doNotTrack !== '1'
}

function readStored() {
  try {
    return JSON.parse(sessionStorage.getItem(STORE_KEY) || 'null')
  } catch {
    return null
  }
}

function fromLocation() {
  const params = new URLSearchParams(window.location.search)
  return {
    referrer: document.referrer || '',
    source: params.get('utm_source') || params.get('ref') || '',
    medium: params.get('utm_medium') || '',
    campaign: params.get('utm_campaign') || '',
  }
}

/** Resolved once per visit; later pages reuse it instead of self-referring. */
export function firstTouch() {
  const stored = readStored()
  if (stored) return stored
  const fresh = fromLocation()
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(fresh))
  } catch {
    /* private mode — send it anyway, just without the memory */
  }
  return fresh
}

function send(payload) {
  const body = JSON.stringify(payload)
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }))
      return
    }
  } catch {
    /* fall through to fetch */
  }
  fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {})
}

export function track(name, props = {}) {
  if (!enabled()) return
  send({ name, path: window.location.pathname, ...firstTouch(), ...props })
}

export function trackPageview(path) {
  track(analyticsEvents.pageview, path ? { path } : {})
}

/** Quote pages own the slug; everywhere else it is read back off the share url. */
export function slugFromQuoteUrl(url) {
  const match = /\/quotes\/([^/?#]+)/.exec(String(url || ''))
  return match ? decodeURIComponent(match[1]) : ''
}

export function trackDownload(slug) {
  track(analyticsEvents.download, { slug })
}

export function trackShare(slug, target) {
  track(analyticsEvents.share, { slug, target })
}

/** Practice events — slug holds the item or plan id; never send journal text. */
export function trackPractice(name, itemId = '', target = '') {
  track(name, { slug: itemId, target })
}
