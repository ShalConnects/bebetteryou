import Image from 'next/image'
import { brand } from '@/config/site'

/** Mark as the quote-card chip (circle crop) + Iceberg wordmark. */
export default function BrandLogo({ className = 'text-paper' }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="inline-flex h-7 w-7 shrink-0 overflow-hidden rounded-full bg-[#0a2e1c] ring-1 ring-line md:h-8 md:w-8">
        <Image src={brand.mark} alt="" width={32} height={32} className="h-full w-full object-cover" />
      </span>
      <span className="font-display text-[1.25rem] leading-none tracking-wide">{brand.wordmark}</span>
    </span>
  )
}
