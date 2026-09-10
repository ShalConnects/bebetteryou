'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { brand, nav } from '@/config/site'
import { bindFocusTrap, focusables } from '@/libs/focus-trap'
import BrandLogo from './BrandLogo'

function isActive(href, path) {
  return path === href || path.startsWith(`${href}/`)
}

function Links({ onClick, className = '' }) {
  const path = usePathname()
  return (
    <nav className={className}>
      {nav.map(({ href, label, soon }) => (
        <Link
          key={href}
          href={href}
          onClick={onClick}
          className={isActive(href, path) ? 'nav-link-active' : 'nav-link'}
        >
          <span className="relative inline-block">
            {label}
            {soon ? (
              <span className="absolute -right-1 -top-2 translate-x-full text-[8px] lowercase tracking-normal text-quiet/55">
                soon
              </span>
            ) : null}
          </span>
        </Link>
      ))}
    </nav>
  )
}

export default function Header() {
  const [open, setOpen] = useState(false)
  const path = usePathname()
  const rootRef = useRef(null)
  const close = () => setOpen(false)

  useEffect(() => {
    close()
  }, [path])

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    const root = rootRef.current
    const undo = bindFocusTrap(root, { onEscape: close })
    focusables(root).find((el) => el.closest('[data-mobile-nav]'))?.focus()
    return () => {
      document.body.style.overflow = ''
      undo()
    }
  }, [open])

  return (
    <header
      ref={rootRef}
      className="sticky top-0 z-50 border-b border-line bg-ink/95 pt-[env(safe-area-inset-top)] backdrop-blur-sm"
    >
      <div className="inset-x-page">
        <div className="shell-inner flex h-14 items-center justify-between md:h-16">
        <Link href="/" onClick={close} aria-label={brand.name} className="shrink-0">
          <BrandLogo />
        </Link>

        <Links className="hidden items-center gap-8 md:flex" />

        <button
          type="button"
          className="inline-flex min-h-10 min-w-10 items-center justify-center text-quiet transition-colors hover:text-paper md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </button>
        </div>
      </div>

      {open ? (
        <div
          id="mobile-nav"
          data-mobile-nav
          className="inset-x-page border-t border-line py-6 md:hidden"
        >
          <Links onClick={close} className="flex flex-col gap-5" />
        </div>
      ) : null}
    </header>
  )
}
