import Image from 'next/image'
import { brand } from '@/config/site'

/** Mark + wordmark. Color via `className` (defaults white). */
export default function BrandLogo({ className = 'text-paper' }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Image src={brand.mark} alt="" width={32} height={32} className="h-7 w-auto md:h-8" />
      <span className="font-display text-sm tracking-wide md:text-base">{brand.wordmark}</span>
    </span>
  )
}
