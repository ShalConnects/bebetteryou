import Link from 'next/link'
import { brand, legal, makerProducts, socials } from '@/config/site'
import SocialIcon from './SocialIcon'
import TraditionLink from './TraditionLink'

function MadeWithLove() {
  return (
    <p className="inline-flex items-center gap-1.5 text-xs text-quiet">
      Made with
      <svg
        viewBox="0 0 24 24"
        width="12"
        height="12"
        aria-hidden
        className="shrink-0 fill-accent text-accent"
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
      by{' '}
      <a
        href="https://shalconnects.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-quiet transition-colors hover:text-paper"
      >
        ShalConnects
      </a>
    </p>
  )
}

export default function Footer() {
  const year = new Date().getFullYear()
  const hasMaker = makerProducts.length > 0

  return (
    <footer className="border-t border-line pb-[env(safe-area-inset-bottom)]">
      <div className="inset-x-page">
        <div className="shell-inner flex flex-col items-center gap-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col items-center gap-4 md:flex-row">
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 md:justify-start">
              {socials.map(({ id, href, label }) => (
                <a
                  key={id}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="inline-flex min-h-10 items-center text-quiet transition-colors hover:text-paper"
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

      <div className="inset-x-page border-t border-line">
        <div
          className={`shell-inner flex flex-col items-center gap-5 py-4 text-center md:flex-row md:items-center md:gap-6 md:text-left ${
            hasMaker ? 'md:justify-between' : 'md:justify-start'
          }`}
        >
          <MadeWithLove />
          {hasMaker ? (
            <div className="flex min-w-0 flex-col items-center gap-1 text-xs text-quiet md:flex-row md:items-center md:justify-end md:gap-x-3">
              <span className="text-[11px] uppercase tracking-[0.2em]">More from this maker:</span>
              <span className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0 leading-none md:justify-end">
                {makerProducts.map(({ name, href }) => (
                  <a
                    key={href}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center py-1 leading-none transition-colors hover:text-paper"
                  >
                    {name}
                  </a>
                ))}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </footer>
  )
}
