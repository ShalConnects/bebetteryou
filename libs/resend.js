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

/** Prefer "BeBetterYou <noreply@…>" when FROM_EMAIL is a bare address. */
export function resolveFromEmail() {
  const raw = (appConfig.fromEmail || '').trim()
  if (!raw) return 'BeBetterYou <noreply@example.com>'
  if (/<[^>]+@[^>]+>/.test(raw)) return raw
  if (raw.includes('@')) return `BeBetterYou <${raw}>`
  return raw
}

export const sendEmail = async ({ to, subject, html, text }) => {
  const resend = getResend()
  if (!resend) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[email dev]', { to, subject, text, from: resolveFromEmail() })
      return { id: 'dev' }
    }
    throw new Error('RESEND_API_KEY is not configured')
  }

  try {
    const payload = {
      from: resolveFromEmail(),
      to,
      subject,
      html,
    }
    if (text) payload.text = text

    const { data, error } = await resend.emails.send(payload)

    if (error) {
      logError('Resend error', error)
      throw new Error('Failed to send email')
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
