'use client'

import { translationsFor } from '@/config/traditions'

const inputClass =
  'w-full border border-line bg-ink px-4 py-3 text-paper outline-none focus:border-paper/40'

export default function PassageAltFields({ tradition, value, onChange }) {
  if (!translationsFor(tradition).some((t) => t.id === 'kjv')) return null

  return (
    <div className="space-y-2 border border-line/40 p-3">
      <p className="text-xs text-quiet">KJV (optional)</p>
      <input
        value={value.kjvRef || ''}
        onChange={(e) => onChange({ ...value, kjvRef: e.target.value })}
        placeholder="KJV reference"
        className={inputClass}
      />
      <textarea
        value={value.kjvText || ''}
        onChange={(e) => onChange({ ...value, kjvText: e.target.value })}
        placeholder="KJV text"
        rows={2}
        className={inputClass}
      />
      <input
        value={value.kjvUrl || ''}
        onChange={(e) => onChange({ ...value, kjvUrl: e.target.value })}
        placeholder="KJV URL (optional)"
        className={inputClass}
      />
    </div>
  )
}
