import { logError } from './logger'

/**
 * Printful REST API v1 (api.printful.com). Server-only — the token must never
 * reach the client. Credentials are read per call so builds succeed without them.
 */
const API_BASE = 'https://api.printful.com'

/**
 * `fetch` imposes no deadline of its own. Without this a stalled Printful
 * connection would hang whatever is waiting on it — including the print page,
 * which blocks on a blank lookup while rendering.
 */
const TIMEOUT_MS = 15000

function headers(extra = {}) {
  const key = process.env.PRINTFUL_API_KEY
  if (!key) throw new Error('PRINTFUL_API_KEY is not set')
  const storeId = process.env.PRINTFUL_STORE_ID
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...(storeId ? { 'X-PF-Store-Id': storeId } : {}),
    ...extra,
  }
}

export function isPrintfulConfigured() {
  return Boolean(process.env.PRINTFUL_API_KEY)
}

/** `revalidate` opts into caching — only safe for catalog reads, never for orders. */
async function call(pathname, { method = 'GET', body, revalidate } = {}) {
  const res = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    ...(revalidate ? { next: { revalidate } } : { cache: 'no-store' }),
  })

  const payload = await res.json().catch(() => null)
  if (!res.ok) {
    const message = payload?.error?.message || payload?.result || `Printful ${res.status}`
    logError('Printful API error', new Error(message), { pathname, status: res.status })
    throw new Error(message)
  }
  return payload?.result ?? payload
}

export const getCatalogVariant = (variantId) => call(`/products/variant/${variantId}`)

/** Catalog reads are static per variant, so they cache for a day. */
export const catalogGet = (pathname) => call(pathname, { revalidate: 86400 })

/** Mockups are async: create a task, then poll `getMockupTask`. Never call from a preview path. */
export const createMockupTask = ({ productId, variantIds, printFileUrl, placement = 'front' }) =>
  call(`/mockup-generator/create-task/${productId}`, {
    method: 'POST',
    body: { variant_ids: variantIds, files: [{ placement, image_url: printFileUrl }] },
  })

export const getMockupTask = (taskKey) =>
  call(`/mockup-generator/task?task_key=${encodeURIComponent(taskKey)}`)

export const estimateOrderCost = (payload) =>
  call('/orders/estimate-costs', { method: 'POST', body: payload })

/** `external_id` is Printful's dedupe key — pass our orderNumber so retries can't double-print. */
export const createOrder = (payload) => call('/orders?confirm=true', { method: 'POST', body: payload })

export const getOrderByExternalId = (externalId) => call(`/orders/@${encodeURIComponent(externalId)}`)

/**
 * Wire format shared by /orders and /orders/estimate-costs. Pure — takes cents and
 * emits Printful's decimal strings, so it is safe to call before an order exists.
 */
export function printfulOrderPayload({ orderNumber, customer, items }) {
  return {
    ...(orderNumber ? { external_id: orderNumber } : {}),
    recipient: {
      name: customer.name,
      email: customer.email,
      address1: customer.address1,
      address2: customer.address2 || '',
      city: customer.city,
      state_code: customer.state || '',
      country_code: customer.country,
      zip: customer.zip,
    },
    items: items.map(({ variantId, quantity, retailPrice, printFileUrl, placement }) => ({
      variant_id: variantId,
      quantity,
      retail_price: (retailPrice / 100).toFixed(2),
      // Optional only so the shape stays testable. Printful rejects a real
      // product with no print file, on estimates as well as orders.
      files: printFileUrl ? [{ placement, url: printFileUrl }] : [],
    })),
  }
}
