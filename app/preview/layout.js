import Link from 'next/link'
import './preview.css'
import { previewNav, pv } from '@/config/preview'
import { noIndex } from '@/libs/seo'

/** Every /preview page: kept out of search, with a strip to hop between them. */
export const metadata = { ...noIndex, title: 'Preview | BeBetterYou' }

export default function PreviewLayout({ children }) {
  return (
    <>
      <nav className="inset-x-page border-b border-line bg-ink-soft/60" aria-label="Preview pages">
        <div className="shell-inner flex gap-5 overflow-x-auto py-2">
          <span className="kicker shrink-0 self-center">Preview</span>
          {previewNav.map(({ href, label }) => (
            <Link key={href} href={pv(href)} className="nav-link shrink-0">
              {label}
            </Link>
          ))}
        </div>
      </nav>
      {children}
    </>
  )
}
