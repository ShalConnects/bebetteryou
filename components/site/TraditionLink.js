'use client'

import { useTradition } from './TraditionProvider'

export default function TraditionLink() {
  const { openPicker } = useTradition()
  return (
    <button type="button" className="tag border border-line px-3 text-xs normal-case tracking-normal" onClick={openPicker}>
      Tradition
    </button>
  )
}
