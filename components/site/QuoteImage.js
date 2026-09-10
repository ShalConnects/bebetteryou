import Image from 'next/image'
import { quoteCard, quoteImageSizes } from '@/config/quote-card'

/** Quote card JPEG via next/image (local or Blob URL). */
export default function QuoteImage({ src, alt, className, sizes, variant, priority, fill }) {
  const props = { src, alt, className, sizes: sizes ?? quoteImageSizes[variant], priority }

  return fill ? (
    <Image {...props} fill />
  ) : (
    <Image {...props} width={quoteCard.width} height={quoteCard.height} />
  )
}
