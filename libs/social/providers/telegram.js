import { resolveTelegramKeys } from '@/libs/integrations/credentials'
import { saveIntegration } from '@/libs/integrations/store'

/** Telegram channel post via Bot API. Uploads the JPEG (works on localhost). */
const API = 'https://api.telegram.org'
const CAPTION_MAX = 1024

/** Sync env-only (tests). Prefer resolveTelegramKeys() at runtime. */
export function telegramKeys() {
  return {
    token: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
  }
}

export function hasTelegramKeys(keys) {
  const k = keys || telegramKeys()
  return Boolean(k.token && k.chatId)
}

export function clipTelegramCaption(text, max = CAPTION_MAX) {
  const s = String(text || '').trim()
  if (s.length <= max) return s
  return `${s.slice(0, max - 1).trimEnd()}…`
}

function messageUrl(chat, messageId) {
  if (!messageId) return null
  const username = chat?.username
  if (username) return `https://t.me/${username}/${messageId}`
  const id = String(chat?.id || '')
  // Private/supergroup channels: strip -100 prefix for t.me/c/ links
  if (id.startsWith('-100')) {
    return `https://t.me/c/${id.slice(4)}/${messageId}`
  }
  return null
}

/** Post quote JPEG + caption to the Telegram channel (bot must be channel admin), or to your alert chat with `alert`. */
export async function postTelegram({ caption, imageBuffer, alert = false }) {
  if (!imageBuffer?.length) throw new Error('Image file missing')
  const keys = await resolveTelegramKeys()
  const { token } = keys
  const chatId = alert ? keys.alertChatId : keys.chatId
  if (!hasTelegramKeys({ token, chatId })) throw new Error(alert ? 'Telegram alerts not linked' : 'Telegram not configured')

  const form = new FormData()
  form.append('chat_id', chatId)
  form.append('caption', clipTelegramCaption(caption))
  form.append('photo', new Blob([new Uint8Array(imageBuffer)], { type: 'image/jpeg' }), 'quote.jpg')

  const res = await fetch(`${API}/bot${token}/sendPhoto`, {
    method: 'POST',
    body: form,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.ok || !data.result?.message_id) {
    throw new Error(data.description || data.error || 'Telegram sendPhoto failed')
  }

  const msg = data.result
  return {
    id: String(msg.message_id),
    url: messageUrl(msg.chat, msg.message_id),
  }
}

/** Link alerts to the last person who messaged the bot privately (send it "hi" first). */
export async function linkTelegramAlerts() {
  const { token } = await resolveTelegramKeys()
  if (!token) throw new Error('Telegram not configured')
  const data = await fetch(`${API}/bot${token}/getUpdates`).then((r) => r.json())
  const chat = (data.result || []).map((u) => u.message?.chat).filter((c) => c?.type === 'private').at(-1)
  if (!chat) throw new Error('Send your bot a message in Telegram first, then try again')
  await saveIntegration('telegram', { extras: { alertChatId: String(chat.id) } })
  return { name: chat.first_name || chat.username || 'you' }
}
