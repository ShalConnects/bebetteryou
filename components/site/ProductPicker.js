'use client'

import { useState } from 'react'
import { publicPrintProducts } from '@/config/print-products'
import { money, productById } from './ProductMock'

/** Tee/mug + colour state, shared by the shop grid and the preview "Wear it". */
export function useProductPick() {
  const [productId, setProductId] = useState('tee')
  const [colorId, setColorId] = useState('black')
  return { productId, colorId, setProductId, setColorId }
}

export default function ProductPicker({ productId, colorId, setProductId, setColorId, className = '' }) {
  const product = productById(productId)
  return (
    <div className={`flex flex-wrap items-center gap-2.5 ${className}`}>
      {publicPrintProducts.map((p) => (
        <button
          key={p.id}
          type="button"
          className={`chip ${p.id === productId ? 'chip-on' : ''}`}
          aria-pressed={p.id === productId}
          onClick={() => setProductId(p.id)}
        >
          {p.name} · {money(p.retail)}
        </button>
      ))}
      <span className="mx-1 h-6 w-px bg-line" aria-hidden />
      {product.colors.map((col) => (
        <button
          key={col.id}
          type="button"
          className={`swatch ${col.id === colorId ? 'swatch-on' : ''}`}
          style={{ background: col.id === 'white' ? '#f4f4f4' : '#111' }}
          aria-label={col.label}
          aria-pressed={col.id === colorId}
          onClick={() => setColorId(col.id)}
        />
      ))}
    </div>
  )
}
