import {
  FROM_ADDRESS,
  loadLogoAttachment,
  LOGO_CID_SRC,
  outreachLetter,
  resolveFrom,
} from './letter.js'
import { unsubUrlFor } from './store.js'

function withCidLogo(letter) {
  const base = letter || outreachLetter({ logoSrc: LOGO_CID_SRC })
  const html = String(base.html || '').replace(
    /(<img\b[^>]*?\bsrc=")[^"]*(")/i,
    `$1${LOGO_CID_SRC}$2`
  )
  return { ...base, html }
}

/** Sends via ShalConnects Resend only — never BeBetterYou RESEND_API_KEY. */
export async function deliverEmail(to, letter = outreachLetter({ logoSrc: LOGO_CID_SRC })) {
  const key = process.env.SHALCONNECTS_RESEND_API_KEY?.trim()
  if (!key) throw new Error('Set SHALCONNECTS_RESEND_API_KEY (ShalConnects Resend, not BeBetterYou).')

  const payload = withCidLogo(letter)

  const unsubUrl = unsubUrlFor(to)
  const listUnsub = unsubUrl
    ? `<mailto:${FROM_ADDRESS}?subject=unsubscribe>, <${unsubUrl}>`
    : `<mailto:${FROM_ADDRESS}?subject=unsubscribe>`

  const headers = [{ name: 'List-Unsubscribe', value: listUnsub }]
  if (unsubUrl) {
    headers.push({ name: 'List-Unsubscribe-Post', value: 'List-Unsubscribe=One-Click' })
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: resolveFrom(),
      to: [to],
      reply_to: FROM_ADDRESS,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      headers,
      attachments: [loadLogoAttachment()],
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = body?.message || body?.error || JSON.stringify(body) || res.statusText
    throw new Error(String(msg))
  }
  return body
}
