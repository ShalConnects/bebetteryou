/** First recipient email from a Resend webhook `data.to` field. */
export function recipientFromResendData(data) {
  const to = data?.to
  if (Array.isArray(to) && to.length) return String(to[0] || '').toLowerCase().trim()
  if (typeof to === 'string') return to.toLowerCase().trim()
  return ''
}
