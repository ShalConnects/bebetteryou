import Image from 'next/image'
import { publicPrintProducts } from '@/config/print-products'
import { quoteOneLine } from '@/libs/quote-text'

export const money = (cents) => `$${Math.round(cents / 100)}`
export const productById = (id) => publicPrintProducts.find((p) => p.id === id) || publicPrintProducts[0]

/**
 * Rough product preview — the real typesetting happens on /print. Text is sized
 * to the print box in container units (% of mockup width) so any length fits.
 * `look` is a mockup-only proposal: { serial, card } (see config/preview teeLooks).
 */
export default function ProductMock({
  quote,
  productId = 'tee',
  colorId = 'black',
  look = {},
  back = false,
  className = 'w-full',
}) {
  const product = productById(productId)
  const color = product.colors.find((c) => c.id === colorId) || product.colors[0]
  const { top, left, width, height } = product.placements[0].frame
  const text = quoteOneLine(quote.text)
  const size = Math.min(height / 2.5, Math.sqrt((0.6 * width * height) / (0.575 * Math.max(text.length, 1))))
  /** The back view mirrors the photo, so the print box mirrors with it. */
  const box = {
    top: `${top}%`,
    left: `${back ? 100 - left - width : left}%`,
    width: `${width}%`,
    height: `${height}%`,
    color: color.ink,
  }

  return (
    <div className={`pv-mock relative aspect-square overflow-hidden ${className}`}>
      <Image
        src={color.mockup}
        alt=""
        fill
        sizes="(min-width: 768px) 28rem, 90vw"
        className="object-cover"
        style={back ? { transform: 'scaleX(-1)' } : undefined}
      />
      {back ? (
        <div className="pv-ink flex-col gap-[0.4em]" style={{ ...box, fontSize: `${height / 3}cqw` }} aria-hidden>
          <span>Be</span>
          <span className="text-[0.45em]">#{quote.n} · bebetteryou.online</span>
        </div>
      ) : look.card ? (
        <div className="pv-ink" style={box} aria-hidden>
          <Image src={quote.src} alt="" width={300} height={375} unoptimized className="h-full w-auto rounded-[4%]" />
        </div>
      ) : (
        <div
          key={`${quote.slug}-${product.id}`}
          className="pv-ink flex-col"
          style={{ ...box, fontSize: `${size}cqw` }}
          aria-hidden
        >
          {text}
          {look.serial ? (
            <span className="mt-[0.8em] text-[0.4em] opacity-70">#{quote.n} · bebetteryou.online</span>
          ) : null}
        </div>
      )}
    </div>
  )
}
