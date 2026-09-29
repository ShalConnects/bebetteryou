/**
 * @jest-environment node
 */
describe('site pitch', () => {
  const prev = process.env.APP_DESCRIPTION

  afterEach(() => {
    if (prev === undefined) delete process.env.APP_DESCRIPTION
    else process.env.APP_DESCRIPTION = prev
    jest.resetModules()
  })

  it('keeps app description, SEO fallback, and homepage copy on one pitch', async () => {
    delete process.env.APP_DESCRIPTION
    const { heroLine, heroSub, sitePitch } = await import('@/config/pitch')
    const { copy } = await import('@/config/site')
    const { appConfig, getAppDescription } = await import('@/config/app')
    const { buildMetadata, sitePitch: seoPitch } = await import('@/libs/seo')

    const expected = `${heroLine} ${heroSub}`
    expect(sitePitch()).toBe(expected)
    expect(seoPitch()).toBe(expected)
    expect(copy.heroLine).toBe(heroLine)
    expect(copy.heroSub).toBe(heroSub)
    expect(copy.aboutTeaser).toContain('better than yesterday')
    expect(copy.aboutTeaser).not.toBe(expected)
    expect(appConfig.description).toBe(expected)
    expect(appConfig.metadata.description).toBe(expected)
    expect(getAppDescription()).toBe(expected)
    expect(buildMetadata().description).toBe(expected)
    expect(buildMetadata().openGraph.description).toBe(expected)
  })

  it('honors APP_DESCRIPTION override in sitePitch', async () => {
    process.env.APP_DESCRIPTION = 'Custom pitch for tests.'
    const { sitePitch } = await import('@/config/pitch')
    expect(sitePitch()).toBe('Custom pitch for tests.')
  })
})
