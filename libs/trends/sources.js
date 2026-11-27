import { trends } from '@/config/trends'
import { resolveXKeys } from '@/libs/integrations/credentials'

const tag = (xml, name) => xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').trim() || ''

/** Each reader returns `[{ topic, context }]`, most popular first. */
export const readers = {
  async google() {
    const xml = await (await fetch(trends.google)).text()
    return xml.split('<item>').slice(1).map((item) => ({ topic: tag(item, 'title'), context: tag(item, 'ht:news_item_title') }))
  },
  async x() {
    const { consumerKey: apiKey, consumerSecret: apiSecret } = await resolveXKeys()
    if (!apiKey || !apiSecret) throw new Error('X keys missing')
    const auth = await fetch('https://api.x.com/oauth2/token', {
      method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    }).then((r) => r.json())
    const data = await fetch(`https://api.x.com/2/trends/by/woeid/${trends.woeid}`, {
      headers: { Authorization: `Bearer ${auth.access_token}` },
    }).then((r) => r.json())
    return (data.data || []).map((t) => ({ topic: t.trend_name, context: '' }))
  },
  async bluesky() {
    const data = await (await fetch(trends.bluesky)).json()
    return (data.trends || [])
      .filter((t) => !trends.blockedCategories.includes(t.category))
      .map((t) => ({ topic: t.displayName, context: t.description || '' }))
  },
}

/** The source whose turn it is on `date` (YYYY-MM-DD), then the others in order. */
export function sourceOrder(date) {
  const turn = Math.floor(Date.parse(date) / 864e5) % trends.sources.length
  return [...trends.sources.slice(turn), ...trends.sources.slice(0, turn)]
}
