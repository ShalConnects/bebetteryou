import Image from 'next/image'
import Link from 'next/link'
import { pv } from '@/config/preview'
import { postHref } from '@/libs/blog-url'
import QuoteImage from '@/components/site/QuoteImage'

/** Note tile. `featured` adds the hero image; `card` shows the quote card it's built around. */
export default function PostTile({ post, card, minutes, featured = false }) {
  return (
    <Link href={pv(postHref(post.slug))} className="pv-tile group">
      <span className={`flex flex-1 flex-col ${featured ? 'md:flex-row md:gap-8' : ''}`}>
        {featured && post.image ? (
          <span className="relative mb-6 block aspect-[16/9] overflow-hidden rounded-lg md:mb-0 md:w-1/2 md:shrink-0">
            <Image
              src={post.image}
              alt=""
              fill
              priority
              sizes="(min-width: 768px) 36rem, 90vw"
              className="object-cover"
            />
          </span>
        ) : null}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[11px] uppercase tracking-[0.2em] text-accent">
            Note{minutes ? ` · ${minutes} min` : ''}
          </span>
          <h3 className={`mt-3 font-display tracking-wide text-paper ${featured ? 'text-3xl md:text-4xl' : 'text-xl'}`}>
            {post.title}
          </h3>
          {post.excerpt ? (
            <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-body/70">{post.excerpt}</p>
          ) : null}
          <span className="mt-auto flex items-end justify-between gap-4 pt-6">
            <span className="text-sm text-quiet transition-colors group-hover:text-accent">Read →</span>
            {card ? (
              <span className="pv-card block w-14 shrink-0" style={{ '--tilt': '4deg' }}>
                <QuoteImage src={card.src} alt="" variant="grid" className="h-auto w-full" />
              </span>
            ) : null}
          </span>
        </span>
      </span>
    </Link>
  )
}
