'use client'

import { useState } from 'react'
import SocialIcon from '@/components/site/SocialIcon'
import { brand } from '@/config/site'
import { slugFromQuoteUrl, trackDownload, trackShare } from '@/libs/analytics-client'
import { saveImage, shareOrCopy, shareTargets } from '@/libs/share'
import { scriptureShareText } from '@/libs/scripture-core'
import { useScriptureQuote } from './TraditionProvider'

const btn =
  'inline-flex min-h-8 min-w-8 shrink-0 items-center justify-center text-quiet transition-colors hover:text-paper sm:min-h-10 sm:min-w-10'

function Icon({ children, ...props }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden {...props}>
      {children}
    </svg>
  )
}

/** Scripture-aware share props — single place for quote detail actions + social. */
export function useShareProps(share, quote) {
  const scripture = useScriptureQuote({ tags: quote.tags, slug: quote.slug, n: quote.n, theme: quote.theme })
  return { ...share, text: scriptureShareText(share.text, scripture) }
}

/** Share controls — `row` (aside) or `rail` (vertical from md). */
export default function QuoteShareRail({
  url,
  text,
  image,
  fileName,
  layout = 'rail',
  showActions = true,
  showSocial = true,
}) {
  const [note, setNote] = useState('')
  const slug = slugFromQuoteUrl(url)

  async function flash(msg) {
    if (!msg) return
    setNote(msg)
    setTimeout(() => setNote(''), 1600)
  }

  async function onShare() {
    try {
      /** A returned message means the share sheet was missing and we copied instead. */
      const copied = await shareOrCopy({ title: text || brand.name, text, url })
      flash(copied)
      trackShare(slug, copied ? 'copy' : 'native')
    } catch (e) {
      if (e?.name !== 'AbortError') flash('Could not share')
    }
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(url)
      flash('Link copied')
      trackShare(slug, 'copy')
    } catch {
      flash('Could not copy')
    }
  }

  async function onDownload() {
    try {
      await saveImage(image, fileName)
      trackDownload(slug)
    } catch {
      flash('Could not save')
    }
  }

  const socialOnly = showSocial && !showActions
  const wrap =
    layout === 'row'
      ? socialOnly
        ? 'flex w-full flex-nowrap items-center justify-between gap-0 sm:w-auto sm:flex-wrap sm:justify-start sm:gap-4'
        : 'flex flex-nowrap items-center gap-1.5 sm:flex-wrap sm:gap-4'
      : 'flex flex-row flex-nowrap items-center justify-center gap-1.5 sm:flex-wrap sm:gap-4 md:flex-col md:gap-5'

  return (
    <div className={wrap} aria-label="Share">
      {showActions ? (
        <>
          <button type="button" onClick={onShare} className={btn} aria-label="Share">
            <Icon>
              <circle cx="18" cy="5" r="2.5" />
              <circle cx="6" cy="12" r="2.5" />
              <circle cx="18" cy="19" r="2.5" />
              <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" strokeLinecap="round" />
            </Icon>
          </button>
          <button type="button" onClick={onCopy} className={btn} aria-label="Copy link">
            <Icon>
              <path d="M10 13a5 5 0 0 0 7.54.54l2-2a5 5 0 0 0-7.07-7.07l-1.72 1.71" strokeLinecap="round" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-2 2a5 5 0 0 0 7.07 7.07l1.71-1.71" strokeLinecap="round" />
            </Icon>
          </button>
          <button type="button" onClick={onDownload} className={btn} aria-label="Save image">
            <Icon>
              <path d="M12 3v12M7 10l5 5 5-5M5 19h14" strokeLinecap="round" strokeLinejoin="round" />
            </Icon>
          </button>
        </>
      ) : null}
      {showActions && showSocial && layout === 'rail' ? (
        <span className="hidden h-px w-3 bg-line md:block" aria-hidden />
      ) : null}
      {showSocial
        ? shareTargets({ url, text, media: image }).map(({ id, label, href }) => (
            <a
              key={id}
              href={href}
              target="_blank"
              rel="noreferrer"
              aria-label={`Share on ${label}`}
              className={btn}
              onClick={() => trackShare(slug, id)}
            >
              <SocialIcon id={id} />
            </a>
          ))
        : null}
      {note ? (
        <p className="basis-full text-center text-[9px] uppercase tracking-[0.14em] text-quiet md:basis-auto md:max-w-[4.5rem] md:leading-tight">
          {note}
        </p>
      ) : null}
    </div>
  )
}
