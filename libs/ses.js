import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'
import { resolveFromEmail, resolveReplyTo, formatEmailError } from '@/libs/resend'
import { logError } from '@/libs/logger'

let client

export function sesConfigured() {
  return Boolean(
    (process.env.SES_ACCESS_KEY_ID || '').trim() && (process.env.SES_SECRET_ACCESS_KEY || '').trim()
  )
}

function getClient() {
  if (!sesConfigured()) return null
  if (!client) {
    client = new SESv2Client({
      region: (process.env.SES_REGION || 'us-east-1').trim(),
      credentials: {
        accessKeyId: process.env.SES_ACCESS_KEY_ID.trim(),
        secretAccessKey: process.env.SES_SECRET_ACCESS_KEY.trim(),
      },
    })
  }
  return client
}

/** Bulk quote, blog, and book updates. Welcome and shop mail stay on Resend. */
export async function sendSesEmail({ to, subject, html, text, replyTo } = {}) {
  const ses = getClient()
  if (!ses) throw new Error('Amazon SES is not configured')

  const from = resolveFromEmail()
  const reply = replyTo || resolveReplyTo()
  const configurationSet = (process.env.SES_CONFIGURATION_SET || '').trim()

  try {
    const result = await ses.send(
      new SendEmailCommand({
        FromEmailAddress: from,
        Destination: { ToAddresses: [to] },
        ReplyToAddresses: reply ? [reply] : undefined,
        ConfigurationSetName: configurationSet || undefined,
        Content: {
          Simple: {
            Subject: { Data: subject, Charset: 'UTF-8' },
            Body: {
              Html: html ? { Data: html, Charset: 'UTF-8' } : undefined,
              Text: text ? { Data: text, Charset: 'UTF-8' } : undefined,
            },
          },
        },
      })
    )
    return { id: result.MessageId || '' }
  } catch (error) {
    logError('SES send failed', error, { to, subject })
    throw new Error(formatEmailError(error))
  }
}
