import { Resend } from 'resend'
import { appConfig, getUrl } from '@/config/app'
import { logError } from './logger'

let client

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  if (!client) client = new Resend(key)
  return client
}

/** Prefer "BeBetterYou <hello@…>" — avoid noreply (hurts inbox trust). */
export function resolveFromEmail() {
  const raw = (process.env.FROM_EMAIL || appConfig.fromEmail || '').trim()
  const fallback = 'BeBetterYou <hello@bebetteryou.online>'
  if (!raw) return fallback

  const named = raw.match(/^(.*)<\s*([^>]+@[^>]+)\s*>\s*$/)
  if (named) {
    const display = (named[1].trim() || 'BeBetterYou').replace(/^["']|["']$/g, '') || 'BeBetterYou'
    const addr = named[2].trim().replace(/^noreply@/i, 'hello@')
    return `${display} <${addr}>`
  }

  if (raw.includes('@')) {
    const addr = raw.replace(/^noreply@/i, 'hello@')
    return `BeBetterYou <${addr}>`
  }
  return raw
}

/** Human-readable Resend / thrown error for logs and the failure dashboard. */
export function formatEmailError(error) {
  if (!error) return 'Failed to send email'
  if (typeof error === 'string') {
    const t = error.trim()
    return t || 'Failed to send email'
  }
  if (typeof error.message === 'string' && error.message.trim()) return error.message.trim()
  if (Array.isArray(error.message)) {
    const joined = error.message.map((m) => String(m || '').trim()).filter(Boolean).join('; ')
    if (joined) return joined
  }
  if (typeof error.name === 'string' && error.name && error.name !== 'Error') return error.name
  try {
    const json = JSON.stringify(error)
    if (json && json !== '{}' && json !== 'null') return json
  } catch {
    /* ignore */
  }
  return 'Failed to send email'
}

/** Replies go to SUPPORT_EMAIL / ADMIN_EMAIL (e.g. Gmail) when set. */
export function resolveReplyTo() {
  const reply = (
    process.env.SUPPORT_EMAIL ||
    process.env.ADMIN_EMAIL ||
    appConfig.supportEmail ||
    appConfig.adminEmail ||
    ''
  ).trim()
  if (!reply || !reply.includes('@')) return null
  return reply
}

export const sendEmail = async ({ to, subject, html, text, replyTo } = {}) => {
  const resend = getResend()
  const from = resolveFromEmail()
  const reply = replyTo || resolveReplyTo()
  if (!resend) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[email dev]', { to, subject, text, from, replyTo: reply })
      return { id: 'dev' }
    }
    throw new Error('RESEND_API_KEY is not configured')
  }

  try {
    const payload = {
      from,
      to,
      subject,
      html,
    }
    if (text) payload.text = text
    if (reply) payload.reply_to = reply

    const { data, error } = await resend.emails.send(payload)

    if (error) {
      logError('Resend error', error)
      throw new Error(formatEmailError(error))
    }

    return data
  } catch (error) {
    logError('Email sending error', error)
    throw error
  }
}

export const sendWelcomeEmail = async (email, name) => {
  const dashboardUrl = getUrl(appConfig.dashboardUrl)
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>Welcome to ${appConfig.name}!</h1>
      <p>Hi ${name},</p>
      <p>Thank you for signing up! We're excited to have you on board.</p>
      <p>You can now access your dashboard and start building amazing applications.</p>
      <a href="${dashboardUrl}" style="background: #34d399; color: #0a140e; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
        Go to Dashboard
      </a>
      <p>Best regards,<br>The ${appConfig.companyName} Team</p>
    </div>
  `

  return sendEmail({
    to: email,
    subject: appConfig.email.welcome.subject(appConfig.name),
    html,
    text: `Welcome to ${appConfig.name}! Hi ${name}, thank you for signing up! You can now access your dashboard at ${dashboardUrl}`
  })
}

export const sendMagicLinkEmail = async ({ to, url }) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Sign in to ${appConfig.name}</h2>
      <p>This link expires in 10 minutes.</p>
      <a href="${url}" style="background:#34d399;color:#0a140e;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin:16px 0;">
        Sign in
      </a>
      <p style="color:#666;font-size:13px;">If you didn't request this, you can ignore this email.</p>
    </div>
  `

  return sendEmail({
    to,
    subject: `Your ${appConfig.name} sign-in link`,
    html,
    text: `Sign in to ${appConfig.name}: ${url}`,
  })
}

export const sendLeadNotification = async (lead) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>New Lead Received</h1>
      <p><strong>Name:</strong> ${lead.name}</p>
      <p><strong>Email:</strong> ${lead.email}</p>
      <p><strong>Message:</strong></p>
      <p>${lead.message}</p>
      <p><strong>Date:</strong> ${new Date(lead.createdAt).toLocaleString()}</p>
    </div>
  `

  return sendEmail({
    to: appConfig.adminEmail,
    subject: appConfig.email.leadNotification.subject(lead.name),
    html,
    text: `New Lead: ${lead.name} (${lead.email}) - ${lead.message}`
  })
}
