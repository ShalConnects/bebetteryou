/** Networks we can publish quote cards to. Enabled when all env keys exist. */
export const postNetworks = [
  {
    id: 'instagram',
    label: 'Instagram',
    env: ['META_ACCESS_TOKEN', 'INSTAGRAM_BUSINESS_ACCOUNT_ID'],
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
  },
  {
    id: 'x',
    label: 'X',
    env: ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_SECRET'],
  },
]

export function networkStatus() {
  return postNetworks.map(({ id, label, env, anyEnv }) => ({
    id,
    label,
    ready:
      env.every((key) => Boolean(process.env[key])) &&
      (!anyEnv || anyEnv.some((key) => Boolean(process.env[key]))),
  }))
}
