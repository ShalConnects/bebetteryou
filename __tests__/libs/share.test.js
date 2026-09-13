/**
 * @jest-environment jsdom
 */
import { saveImage, shareTargets } from '@/libs/share'

describe('saveImage', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('uses a direct download link for same-origin paths', async () => {
    const clicks = []
    const orig = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function click() {
      clicks.push({ href: this.href, download: this.download })
    }
    await saveImage('/quotes/bby1.jpg', 'bby1.jpg')
    HTMLAnchorElement.prototype.click = orig
    expect(clicks[0].download).toBe('bby1.jpg')
    expect(clicks[0].href).toContain('/quotes/bby1.jpg')
  })

  it('builds share targets with media', () => {
    const targets = shareTargets({ url: 'https://x.test/q', text: 'Hi', media: 'https://x.test/a.jpg' })
    expect(targets.find((t) => t.id === 'pinterest').href).toContain('a.jpg')
  })

  it('fetches cross-origin images before saving', async () => {
    const blob = new Blob(['jpg'], { type: 'image/jpeg' })
    global.fetch = jest.fn(async () => ({ ok: true, blob: async () => blob }))
    URL.createObjectURL = jest.fn(() => 'blob:mock')
    URL.revokeObjectURL = jest.fn()
    const clicks = []
    const orig = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function click() {
      clicks.push({ href: this.href, download: this.download })
    }
    await saveImage('https://cdn.example/quotes/bby1.jpg', 'bby1.jpg')
    HTMLAnchorElement.prototype.click = orig
    expect(global.fetch).toHaveBeenCalledWith('https://cdn.example/quotes/bby1.jpg')
    expect(clicks[0].download).toBe('bby1.jpg')
    expect(clicks[0].href).toBe('blob:mock')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
  })
})
