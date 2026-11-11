/** ShalConnects outreach letter (canonical for /dashboard/outreach). */

import { LOGO_DATA_URI, LOGO_JPEG_BASE64 } from './logo-data.js'

export const WORK_URL = 'https://www.shalconnects.com/work'
export const SHOPIFY_URL = 'https://www.shalconnects.com/case-studies/bonterra-home'
export const WORDPRESS_URL = 'https://www.shalconnects.com/case-studies/wordpress-trendrio'
export const FROM_ADDRESS = 'hello@shalconnects.com'
export const DAILY_CAP = 100
export const BRAND_GREEN = '#176641'
export const BRAND_GREEN_LIGHT = '#4ade80'
export const BRAND_BG = '#070b14'
export const BRAND_CARD = '#0f172a'
export const BRAND_MUTED = '#94a3b8'
export const BRAND_TEXT = '#e2e8f0'
/** Hosted after ShalConnects deploy — secondary fallback. */
export const LOGO_URL = 'https://www.shalconnects.com/images/shalconnects-mark.jpg'
/** Inline CID used when sending via Resend attachments. */
export const LOGO_CID = 'shalconnects-logo'
export const LOGO_CID_SRC = `cid:${LOGO_CID}`
export { LOGO_DATA_URI }
/** Site fonts from index.html — Outfit body, Space Grotesk available. */
export const FONT_STACK =
  "'Outfit', 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i
const BAD_LOCAL = /^(noreply|no-reply|donotreply|do-not-reply|mailer-daemon|postmaster)$/i

/** Small JPEG baked on brand card color — attached as CID so clients always show it. */
export function loadLogoAttachment() {
  return {
    filename: 'shalconnects-mark.jpg',
    content: LOGO_JPEG_BASE64,
    content_id: LOGO_CID,
    content_type: 'image/jpeg',
  }
}

export function isValidEmail(email) {
  const e = String(email || '').trim().toLowerCase()
  if (!EMAIL.test(e) || e === FROM_ADDRESS) return false
  const [local, domain] = e.split('@')
  if (!local || !domain || !domain.includes('.') || BAD_LOCAL.test(local)) return false
  return true
}

/** Always ShalConnects from — never BeBetterYou FROM_EMAIL. */
export function resolveFrom() {
  const raw = (process.env.SHALCONNECTS_FROM || '').trim()
  if (raw.includes('@')) return raw
  return `ShalConnects <${FROM_ADDRESS}>`
}

export function outreachLetter({ name = '', logoSrc = LOGO_DATA_URI } = {}) {
  const hi = name.trim() ? `Hi ${name.trim()},` : 'Hi there,'
  const subject = 'Is your online store reaching its full potential?'

  const text = `${hi}

Your website is often the first impression customers have of your business. Is it giving them a reason to choose you?

At ShalConnects, we help businesses turn underperforming websites and online stores into better experiences that build trust, attract customers, and generate more sales.

What we can improve
• More sales — smoother buying path from visit to checkout
• Stronger first impressions — a professional look that builds confidence
• Better UX — clearer navigation, faster pages, easier to use
• Room to grow — a store that can support your next stage

See what we've built
• Work: ${WORK_URL}
• Shopify: ${SHOPIFY_URL}
• WordPress: ${WORDPRESS_URL}

If something on your site isn't working the way you'd like, reply with your website URL and a short note. I'll review design, UX, and conversion opportunities and share a few practical ideas.

No pressure. No commitment. Just actionable feedback.

Best,
Shalauddin Kader
ShalConnects
${FROM_ADDRESS}

P.S. Prefer not to hear from us? Reply "unsubscribe".`

  const link = (href, label) =>
    `<a href="${href}" style="color:${BRAND_GREEN_LIGHT};text-decoration:underline;">${label}</a>`

  // Dark + green to match shalconnects.com; no big CTA buttons (deliverability).
  // Logo: CID when sending (deliver.js), hosted URL for preview.
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <title>${subject}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet" />
  <!--[if mso]><style type="text/css">body, table, td { font-family: Arial, Helvetica, sans-serif !important; }</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:${BRAND_BG};font-family:${FONT_STACK};-webkit-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND_BG};padding:28px 12px;font-family:${FONT_STACK};">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:${BRAND_CARD};border:1px solid #1f2937;font-family:${FONT_STACK};">
          <tr>
            <td style="padding:18px 22px 14px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left" valign="middle" style="font-family:${FONT_STACK};">
                    <div style="font-family:'Space Grotesk',${FONT_STACK};font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">ShalConnects</div>
                    <div style="font-family:${FONT_STACK};font-size:12px;color:${BRAND_MUTED};padding-top:3px;">We connect brands with their audience</div>
                  </td>
                  <td align="right" valign="middle" width="64" style="padding-left:16px;">
                    <a href="https://www.shalconnects.com/" style="text-decoration:none;border:0;">
                      <img src="${logoSrc}" width="48" height="65" alt="ShalConnects" style="display:block;border:0;outline:none;text-decoration:none;width:48px;height:auto;max-height:65px;" />
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="height:3px;background:${BRAND_GREEN};font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:26px 28px 6px;font-family:${FONT_STACK};color:#f8fafc;font-size:15px;line-height:1.6;">
              ${hi}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 16px;font-family:${FONT_STACK};color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;letter-spacing:-0.02em;">
              Is your online store reaching its full potential?
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 14px;font-family:${FONT_STACK};color:${BRAND_TEXT};font-size:15px;line-height:1.65;">
              Your website is often the first impression customers have of your business. Is it giving them a reason to choose you?
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 22px;font-family:${FONT_STACK};color:${BRAND_TEXT};font-size:15px;line-height:1.65;">
              At ShalConnects, we help businesses turn underperforming websites and online stores into clearer, more trustworthy experiences that attract customers and convert more sales.
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 10px;font-family:${FONT_STACK};color:#ffffff;font-size:14px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">
              What we can improve
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 22px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#111827;border:1px solid #1f2937;">
                <tr>
                  <td style="padding:14px 16px;font-family:${FONT_STACK};color:${BRAND_TEXT};font-size:14px;line-height:1.55;border-bottom:1px solid #1f2937;">
                    <span style="color:${BRAND_GREEN_LIGHT};font-weight:700;">More sales</span> — a smoother path from visit to checkout
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;font-family:${FONT_STACK};color:${BRAND_TEXT};font-size:14px;line-height:1.55;border-bottom:1px solid #1f2937;">
                    <span style="color:${BRAND_GREEN_LIGHT};font-weight:700;">Stronger first impressions</span> — design that builds confidence
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;font-family:${FONT_STACK};color:${BRAND_TEXT};font-size:14px;line-height:1.55;border-bottom:1px solid #1f2937;">
                    <span style="color:${BRAND_GREEN_LIGHT};font-weight:700;">Better UX</span> — clearer navigation, faster pages, easier to use
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;font-family:${FONT_STACK};color:${BRAND_TEXT};font-size:14px;line-height:1.55;">
                    <span style="color:${BRAND_GREEN_LIGHT};font-weight:700;">Room to grow</span> — a store ready for your next stage
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 8px;font-family:${FONT_STACK};color:#ffffff;font-size:14px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">
              See what we've built
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 22px;font-family:${FONT_STACK};color:${BRAND_MUTED};font-size:14px;line-height:1.8;">
              ${link(WORK_URL, 'Explore our work')}
              <span style="color:#334155;"> · </span>
              ${link(SHOPIFY_URL, 'Shopify case study')}
              <span style="color:#334155;"> · </span>
              ${link(WORDPRESS_URL, 'WordPress case study')}
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#111827;border-left:3px solid ${BRAND_GREEN};">
                <tr>
                  <td style="padding:16px 18px;font-family:${FONT_STACK};color:${BRAND_TEXT};font-size:14px;line-height:1.65;">
                    <div style="color:#ffffff;font-size:15px;font-weight:700;padding-bottom:8px;">Want a quick look at your site?</div>
                    Reply with your website URL and a short note about what's not working as you'd like. I'll review design, UX, and conversion opportunities and share a few practical improvements.<br /><br />
                    <span style="color:${BRAND_GREEN_LIGHT};font-weight:700;">No pressure. No commitment. Just actionable feedback.</span><br /><br />
                    Hit reply — or email
                    <a href="mailto:${FROM_ADDRESS}?subject=Website%20review%20request" style="color:${BRAND_GREEN_LIGHT};text-decoration:underline;">${FROM_ADDRESS}</a>.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:4px 28px 8px;font-family:${FONT_STACK};color:#f8fafc;font-size:15px;line-height:1.6;">
              Best,<br /><br />
              <strong style="color:#ffffff;">Shalauddin Kader</strong><br />
              <span style="color:${BRAND_MUTED};">ShalConnects</span><br />
              <a href="mailto:${FROM_ADDRESS}" style="color:${BRAND_GREEN_LIGHT};text-decoration:none;">${FROM_ADDRESS}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 24px;border-top:1px solid #1f2937;font-family:${FONT_STACK};color:${BRAND_MUTED};font-size:12px;line-height:1.55;">
              <strong style="color:#cbd5e1;">P.S.</strong> Prefer not to hear from us? Reply "unsubscribe".
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return { subject, text, html }
}

function isCsvHeaderRow(cells) {
  if (!cells.length) return false
  const normalized = cells.map((c) => c.toLowerCase()).filter(Boolean)
  if (!normalized.length) return false
  // Skip "email,name" / "name,email" / single "email" header lines.
  return normalized.every((c) => /^(name|email|e-mail|mail)$/i.test(c))
}

export function parseList(text) {
  const people = []
  const removed = []
  const seen = new Set()
  const removedSeen = new Set()

  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const cells = line.split(',').map((s) => s.trim().replace(/^"|"$/g, ''))
    if (isCsvHeaderRow(cells)) continue
    const emailCell = cells.find((c) => /@/.test(c))
    if (!emailCell) {
      const key = `no-email:${line.toLowerCase()}`
      if (!removedSeen.has(key)) {
        removedSeen.add(key)
        removed.push({ email: line, reason: 'no-email' })
      }
      continue
    }
    const email = emailCell.toLowerCase()
    if (!isValidEmail(email)) {
      const key = `invalid:${email}`
      if (!removedSeen.has(key)) {
        removedSeen.add(key)
        removed.push({ email, reason: 'invalid' })
      }
      continue
    }
    if (seen.has(email)) {
      removed.push({ email, reason: 'duplicate' })
      continue
    }
    const name = cells.find((c) => c && c.toLowerCase() !== email && !EMAIL.test(c)) || ''
    seen.add(email)
    people.push({ name: /^(name|email)$/i.test(name) ? '' : name, email })
  }

  return { people, removed }
}

export function selectBatch(people, blocked, room) {
  if (room <= 0) return []
  const skip = new Set(blocked.map((e) => String(e).toLowerCase()))
  return people.filter((p) => !skip.has(p.email)).slice(0, room)
}
