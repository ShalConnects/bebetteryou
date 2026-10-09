import { publicPrintProducts } from '@/config/print-products'
import { quoteCard } from '@/config/quote-card'
import { customPrintSlug, printHref } from '@/libs/print-link'

/** "Write your own" → /print/own. Shared by /shop and the preview shop. */
export default function PrintOwnForm({ className = '', children }) {
  return (
    <form action={printHref(customPrintSlug)} method="get" className={`space-y-4 ${className}`}>
      {children}
      <label className="block">
        <span className="mb-2 block text-[11px] uppercase tracking-[0.2em] text-quiet">Line</span>
        <textarea
          name="text"
          required
          rows={4}
          maxLength={quoteCard.quote.maxChars}
          className="w-full resize-none border border-line bg-ink px-4 py-3 text-paper outline-none focus:border-paper/40"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-[11px] uppercase tracking-[0.2em] text-quiet">Author</span>
        <input
          name="author"
          maxLength={80}
          placeholder="Optional"
          className="w-full border border-line bg-ink px-4 py-3 text-paper outline-none focus:border-paper/40"
        />
      </label>
      <span className="flex flex-wrap justify-center gap-4 sm:justify-start">
        {publicPrintProducts.map((product) => (
          <button
            key={product.id}
            type="submit"
            name="product"
            value={product.id}
            className="tag font-semibold text-accent hover:text-paper"
          >
            {product.name}
          </button>
        ))}
      </span>
    </form>
  )
}
