'use client'

import { traditions } from '@/config/traditions'

export default function TraditionPicker({ onPick, active }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {traditions.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          className={id === active ? 'tag-active' : 'tag'}
          aria-pressed={id === active}
          onClick={() => onPick(id)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
