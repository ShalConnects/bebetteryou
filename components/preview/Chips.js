import Link from 'next/link'
import { previewCopy as c } from '@/config/preview'

/** Pill row. Items with `href` are links (filters); items with `onClick` are buttons (client). */
export default function Chips({ items, label, className = '' }) {
  return (
    <div className={`flex flex-wrap gap-2.5 ${className}`} role="group" aria-label={label}>
      {items.map(({ key, label: text, href, onClick, active }) => {
        const cls = `pv-chip ${active ? 'pv-chip-on' : ''}`
        return href ? (
          <Link key={key} href={href} className={cls} aria-current={active ? 'true' : undefined}>
            {text}
          </Link>
        ) : (
          <button key={key} type="button" onClick={onClick} className={cls} aria-pressed={Boolean(active)}>
            {text}
          </button>
        )
      })}
    </div>
  )
}

/** "All" + one chip per mood whose tag is in `tags`, each linking via `hrefFor(tag)`. */
export function moodLinks(moods, tags, active, hrefFor) {
  const have = new Set(tags)
  return [
    { key: 'all', label: c.all, href: hrefFor(), active: !active },
    ...moods
      .filter((m) => have.has(m.tag))
      .map((m) => ({
        key: m.tag,
        label: m.label,
        href: hrefFor(m.tag),
        active: active === m.tag,
      })),
  ]
}
