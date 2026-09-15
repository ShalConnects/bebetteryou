import Link from 'next/link'
import { brand, legal, makerProducts, socials } from '@/config/site'
import SocialIcon from './SocialIcon'
import TraditionLink from './TraditionLink'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-line pb-[env(safe-area-inset-bottom)]">
      <div className="inset-x-page">
        <div className="shell-inner flex flex-col items-center gap-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col items-center gap-4 md:flex-row">
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

      <div className="inset-x-page">
        <div className="shell-inner flex flex-col items-center gap-2 py-4 text-center">
          <div className="inline-flex flex-col items-center gap-2">
            <span className="h-px w-full bg-line" aria-hidden />
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
            {makerProducts.length ? (
              <p className="text-[11px] uppercase tracking-[0.2em] text-quiet">More from this maker</p>
            ) : null}
          </div>
          {makerProducts.length ? (
            <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              {makerProducts.map(({ name, href }) => (
                <li key={href}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-10 items-center text-xs text-quiet transition-colors hover:text-paper"
                  >
                    {name}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </footer>
  )
}
