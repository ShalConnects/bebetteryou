import {
  buildBlogEmail,
  buildBookEmail,
  buildQuoteEmail,
  buildWelcomeEmail,
  discoveryHtml,
  normalizePrefs,
  DEFAULT_NEWSLETTER_PREFS,
} from '@/libs/newsletter-email'

describe('newsletter', () => {
  describe('normalizePrefs', () => {
    it('defaults to quotes, blog, and books on', () => {
      expect(normalizePrefs()).toEqual(DEFAULT_NEWSLETTER_PREFS)
      expect(normalizePrefs({})).toEqual({ quotes: true, blog: true, books: true })
    })

    it('respects explicit false', () => {
      expect(normalizePrefs({ quotes: false, blog: true, books: false })).toEqual({
        quotes: false,
        blog: true,
        books: false,
      })
    })
  })

  describe('discoveryHtml', () => {
    it('always includes shop and omits empty quote/post/book sections', () => {
      const html = discoveryHtml({})
      expect(html).toContain('/shop')
      expect(html).toContain('Shop tees &amp; mugs')
      expect(html).not.toContain('Quote cards')
      expect(html).not.toContain('From the blog')
      expect(html).not.toContain('Book pick')
    })

    it('renders a 2x2 quote grid when cards exist', () => {
      const html = discoveryHtml({
        quotes: [
          { n: 1, slug: 'bby-1', src: '/q1.jpg' },
          { n: 2, slug: 'bby-2', src: '/q2.jpg' },
        ],
      })
      expect(html).toContain('Quote cards')
      expect(html).toContain('/quotes/bby-1')
      expect(html).toContain('/quotes/bby-2')
    })
  })

  describe('email builders', () => {
    const token = 'abc123tokenvaluehere'
    const extras = {
      quotes: [{ n: 10, slug: 'bby-10', src: 'https://cdn.example/q.jpg' }],
      posts: [{ slug: 'hello', title: 'Hello', excerpt: 'Hi there.' }],
      book: { slug: 'atomic-habits', title: 'Atomic Habits', author: 'James Clear', blurb: 'Tiny.' },
    }

    it('builds a welcome email with prefs, chip, brand, and discovery', () => {
      const mail = buildWelcomeEmail({
        token,
        prefs: { quotes: true, blog: true, books: false },
        extras,
      })
      expect(mail.subject).toBe('You’re in — BeBetterYou')
      expect(mail.html).toContain('Quote cards whenever we post')
      expect(mail.html).toContain('Browse quotes')
      expect(mail.html).toContain('/brand/fav.png')
      expect(mail.html).toContain('subscribed at BeBetterYou')
      expect(mail.html).toContain('/shop')
      expect(mail.html).toContain('/unsubscribe?t=')
    })

    it('builds a quote email with card image and discovery', () => {
      const mail = buildQuoteEmail({
        token,
        extras,
        quote: {
          n: 221,
          slug: 'bby-221',
          text: 'Be better than yesterday.',
          author: 'BeBetterYou',
          src: 'https://example.public.blob.vercel-storage.com/bby221.jpg',
        },
      })
      expect(mail.subject).toContain('#221')
      expect(mail.html).toContain('bby221.jpg')
      expect(mail.html).toContain('/quotes/bby-221')
      expect(mail.html).toContain('/shop')
    })

    it('builds blog email with summary before CTA then discovery', () => {
      const blog = buildBlogEmail({
        token,
        extras,
        post: {
          slug: 'from-blah-to-blaze',
          title: 'From Blah to Blaze',
          excerpt: 'Start small.',
        },
      })
      expect(blog.html).toContain('Start small.')
      expect(blog.html).toContain('Read the post')
      expect(blog.html).toContain('/shop')
      expect(blog.html).toContain('subscribed at BeBetterYou')
    })

    it('builds book email with blurb before CTA then discovery', () => {
      const book = buildBookEmail({
        token,
        extras: { quotes: [], posts: [], book: null },
        book: {
          slug: 'atomic-habits',
          title: 'Atomic Habits',
          author: 'James Clear',
          asin: '0735211299',
          blurb: 'Tiny changes.',
        },
      })
      expect(book.subject).toContain('Atomic Habits')
      expect(book.html).toContain('James Clear')
      expect(book.html).toContain('Tiny changes.')
      expect(book.html).toContain('View book')
      expect(book.html).toContain('/shop')
    })
  })
})
