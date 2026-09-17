/**
 * @jest-environment node
 */
describe('resend from / reply-to', () => {
  const prevFrom = process.env.FROM_EMAIL
  const prevSupport = process.env.SUPPORT_EMAIL
  const prevAdmin = process.env.ADMIN_EMAIL

  afterEach(() => {
    if (prevFrom === undefined) delete process.env.FROM_EMAIL
    else process.env.FROM_EMAIL = prevFrom
    if (prevSupport === undefined) delete process.env.SUPPORT_EMAIL
    else process.env.SUPPORT_EMAIL = prevSupport
    if (prevAdmin === undefined) delete process.env.ADMIN_EMAIL
    else process.env.ADMIN_EMAIL = prevAdmin
  })

  it('rewrites noreply@ to hello@ and wraps display name', async () => {
    process.env.FROM_EMAIL = 'noreply@bebetteryou.online'
    const { resolveFromEmail } = await import('@/libs/resend')
    expect(resolveFromEmail()).toBe('BeBetterYou <hello@bebetteryou.online>')
  })

  it('rewrites noreply inside angled From', async () => {
    process.env.FROM_EMAIL = 'BeBetterYou <noreply@bebetteryou.online>'
    const { resolveFromEmail } = await import('@/libs/resend')
    expect(resolveFromEmail()).toBe('BeBetterYou <hello@bebetteryou.online>')
  })

  it('uses SUPPORT_EMAIL for reply-to', async () => {
    process.env.SUPPORT_EMAIL = 'bebetteryou.motivational@gmail.com'
    const { resolveReplyTo } = await import('@/libs/resend')
    expect(resolveReplyTo()).toBe('bebetteryou.motivational@gmail.com')
  })
})
