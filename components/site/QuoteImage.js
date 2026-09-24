import Image from 'next/image'
import { quoteCard, quoteImageSizes } from '@/config/quote-card'

/** Quote card JPEG (local or Blob). Already 600×750 — skip Vercel Image Optimization. */
export default function QuoteImage({ src, alt, className, sizes, variant, priority, fill }) {
  const props = {
    src,
    alt,
    className,
    sizes: sizes ?? quoteImageSizes[variant],
    priority,
    unoptimized: true,
  }

  return fill ? (
    <Image {...props} fill />
  ) : (
    <Image {...props} width={quoteCard.width} height={quoteCard.height} />
  )
}
