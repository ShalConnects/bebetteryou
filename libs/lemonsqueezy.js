/**
 * Lemon Squeezy — webhook HMAC verification (server-only)
 */

export async function verifyLemonSqueezyWebhook(rawBody, signature) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET
  if (!secret || !signature) return false

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  )

  return crypto.subtle.verify(
    'HMAC',
    key,
    Buffer.from(signature, 'hex'),
    encoder.encode(rawBody)
  )
}
