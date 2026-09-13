import crypto from 'crypto'
import { amazonTag } from '@/config/books'

const HOST = 'webservices.amazon.com'
const REGION = 'us-east-1'
const SERVICE = 'ProductAdvertisingAPI'
const PATH = '/paapi5/getitems'
const TARGET = 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems'

export function paapiReady() {
  return Boolean(
    process.env.AMAZON_PA_ACCESS_KEY &&
      process.env.AMAZON_PA_SECRET_KEY &&
      amazonTag
  )
}

function hmac(key, data) {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest()
}

function sha256(data) {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex')
}

function signature(secret, day, stringToSign) {
  const kDate = hmac(`AWS4${secret}`, day)
  const kRegion = hmac(kDate, REGION)
  const kService = hmac(kRegion, SERVICE)
  const kSigning = hmac(kService, 'aws4_request')
  return hmac(kSigning, stringToSign).toString('hex')
}

/** PA-API 5 GetItems — returns `{ [asin]: { amount, display, currency } }`. */
export async function fetchAmazonPrices(asins = []) {
  const accessKey = process.env.AMAZON_PA_ACCESS_KEY || ''
  const secretKey = process.env.AMAZON_PA_SECRET_KEY || ''
  const ids = [...new Set(asins.filter(Boolean))].slice(0, 10)
  if (!paapiReady() || !ids.length) return {}

  const body = JSON.stringify({
    ItemIds: ids,
    PartnerTag: amazonTag,
    PartnerType: 'Associates',
    Marketplace: 'www.amazon.com',
    Resources: ['Offers.Listings.Price'],
  })

  const { amz, day } = (() => {
    const iso = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '')
    return { amz: iso, day: iso.slice(0, 8) }
  })()

  const headers = {
    host: HOST,
    'content-type': 'application/json; charset=utf-8',
    'content-encoding': 'amz-1.0',
    'x-amz-date': amz,
    'x-amz-target': TARGET,
  }
  const signedHeaders = 'content-encoding;content-type;host;x-amz-date;x-amz-target'
  const canonical = [
    'POST',
    PATH,
    '',
    `content-encoding:${headers['content-encoding']}`,
    `content-type:${headers['content-type']}`,
    `host:${HOST}`,
    `x-amz-date:${amz}`,
    `x-amz-target:${TARGET}`,
    '',
    signedHeaders,
    sha256(body),
  ].join('\n')

  const scope = `${day}/${REGION}/${SERVICE}/aws4_request`
  const stringToSign = ['AWS4-HMAC-SHA256', amz, scope, sha256(canonical)].join('\n')
  const sig = signature(secretKey, day, stringToSign)

  const res = await fetch(`https://${HOST}${PATH}`, {
    method: 'POST',
    headers: {
      ...headers,
      Authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${sig}`,
    },
    body,
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`PA-API ${res.status}${err ? `: ${err.slice(0, 200)}` : ''}`)
  }

  const data = await res.json()
  const out = {}
  for (const item of data?.ItemsResult?.Items || []) {
    const asin = item.ASIN
    const offer = item.Offers?.Listings?.[0]?.Price
    if (!asin || !offer) continue
    out[asin] = {
      amount: offer.Amount,
      currency: offer.Currency || 'USD',
      display: offer.DisplayAmount || (offer.Amount != null ? `$${offer.Amount}` : ''),
    }
  }
  return out
}
