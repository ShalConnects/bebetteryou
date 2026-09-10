import Link from 'next/link'
import { brand, legal, socials } from '@/config/site'
import SocialIcon from './SocialIcon'
import TraditionLink from './TraditionLink'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-line pb-[env(safe-area-inset-bottom)]">
      <div className="inset-x-page">
        <div className="shell-inner flex flex-col items-center gap-4 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center justify-center gap-4">
        <div className="flex items-center gap-1">
          {socials.map(({ id, href, label }) => (
            <a
              key={id}
              href={href}
              target="_blank"
              rel="noreferrer"
              aria-label={label}
              className="inline-flex min-h-10 min-w-10 items-center justify-center text-quiet transition-colors hover:text-paper"
            >
              <SocialIcon id={id} />
            </a>
          ))}
        </div>
        <TraditionLink />
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-6 md:items-center">
          <p className="text-xs text-quiet">
            © {year} {brand.name}
          </p>
          <nav className="flex items-center gap-1" aria-label="About and legal">
            {legal.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex min-h-10 items-center px-2 text-xs text-quiet transition-colors hover:text-paper"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        </div>
      </div>
    </footer>
  )
}
