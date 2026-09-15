import {
  buildBlogEmail,
  buildBookEmail,
  buildQuoteEmail,
  buildWelcomeEmail,
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

  describe('email builders', () => {
    const token = 'abc123tokenvaluehere'

    it('builds a welcome email listing prefs', () => {
      const mail = buildWelcomeEmail({
        token,
        prefs: { quotes: true, blog: true, books: false },
      })
      expect(mail.subject).toMatch(/You’re in/)
      expect(mail.html).toContain('Quote cards whenever we post')
      expect(mail.html).toContain('New blog posts')
      expect(mail.html).not.toContain('New book recommendations')
      expect(mail.html).toContain(`/unsubscribe?t=${token}`)
    })

    it('builds a quote email with card image and link', () => {
      const mail = buildQuoteEmail({
        token,
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
      expect(mail.html).toContain('Be better than yesterday.')
      expect(mail.text).toContain('Be better than yesterday.')
    })

    it('builds blog and book emails', () => {
      const blog = buildBlogEmail({
        token,
        post: {
          slug: 'from-blah-to-blaze',
          title: 'From Blah to Blaze',
          excerpt: 'Start small.',
        },
      })
      expect(blog.html).toContain('/blog/from-blah-to-blaze')
      expect(blog.html).toContain('Start small.')

      const book = buildBookEmail({
        token,
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
    })
  })
})
