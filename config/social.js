/** Networks we can publish quote cards to. Enabled when all env keys exist. */
export const postNetworks = [
  {
    id: 'instagram',
    label: 'Instagram',
    env: ['META_ACCESS_TOKEN', 'INSTAGRAM_BUSINESS_ACCOUNT_ID'],
  },
  {
    id: 'threads',
    label: 'Threads',
    env: ['THREADS_ACCESS_TOKEN', 'THREADS_USER_ID'],
  },
  {
    id: 'facebook',
    label: 'Facebook',
    env: ['FACEBOOK_PAGE_ACCESS_TOKEN', 'FACEBOOK_PAGE_ID'],
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    env: ['LINKEDIN_ACCESS_TOKEN'],
    /** Post as company page (org) or personal profile (member). */
    anyEnv: ['LINKEDIN_ORG_ID', 'LINKEDIN_MEMBER_ID'],
    /** Set true while LinkedIn API / product access is under review. */
    pendingEnv: 'LINKEDIN_PENDING',
  },
  {
    id: 'x',
    label: 'X',
    env: ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_SECRET'],
  },
  {
    id: 'youtube',
    label: 'YouTube Shorts',
    env: ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN'],
  },
  {
    id: 'pinterest',
    label: 'Pinterest',
    env: ['PINTEREST_ACCESS_TOKEN', 'PINTEREST_BOARD_ID'],
    /**
     * Trial apps only write via Sandbox (not public). While sandbox is on,
     * admin shows Pending approval. After Standard access, set to false.
     */
    pendingEnv: 'PINTEREST_SANDBOX',
  },
  {
    id: 'bluesky',
    label: 'Bluesky',
    env: ['BLUESKY_HANDLE', 'BLUESKY_APP_PASSWORD'],
  },
  {
    id: 'telegram',
    label: 'Telegram',
    env: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'],
  },
]

function envTruthy(key) {
  const s = process.env[key]
  return s === '1' || s === 'true'
}

export function networkStatus() {
  return postNetworks.map(({ id, label, env, anyEnv, pendingEnv }) => {
    if (pendingEnv && envTruthy(pendingEnv)) {
      return { id, label, ready: false, pending: true, connectable: false }
    }

    const configured =
      env.every((key) => Boolean(process.env[key])) &&
      (!anyEnv || anyEnv.some((key) => Boolean(process.env[key])))

    return { id, label, ready: configured, pending: false, connectable: false }
  })
}
