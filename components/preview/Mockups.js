import QuoteImage from '@/components/site/QuoteImage'
import { quoteAlt } from '@/libs/quote-text'

/** The card framed on a wall, for the printable proposal. */
export function FrameMock({ quote }) {
  return (
    <span className="pv-wall">
      <span className="pv-frame">
        <QuoteImage src={quote.src} alt={quoteAlt(quote)} className="h-auto w-full" />
      </span>
    </span>
  )
}

/** The card as a lock screen, for the wallpaper proposal. */
export function PhoneMock({ quote }) {
  return (
    <span className="pv-phone">
      <span className="pv-phone-time">9:41</span>
      <QuoteImage src={quote.src} alt={quoteAlt(quote)} className="h-auto w-full" />
    </span>
  )
}
