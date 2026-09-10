'use client'

import { useState } from 'react'
import { field, legend, Preview, Row } from '@/components/site/print-ui'
import { usePrintDesign } from '@/components/site/usePrintDesign'
import { postJson } from '@/libs/print-client'
import { formatPrice } from '@/libs/print-format'

const emptyAddress = {
  name: '',
  email: '',
  address1: '',
  address2: '',
  city: '',
  state: '',
  zip: '',
  country: 'US',
}

const fields = [
  ['name', 'Full name', 'text'],
  ['email', 'Email', 'email'],
  ['address1', 'Address', 'text'],
  ['address2', 'Apartment (optional)', 'text'],
  ['city', 'City', 'text'],
  ['state', 'State / region', 'text'],
  ['zip', 'Postal code', 'text'],
  ['country', 'Country code', 'text'],
]

/**
 * Step two: address, then price, then order. The selection arrives already
 * validated against the catalog by the page, so nothing here can widen it —
 * this component only adds where it ships to.
 */
export default function PrintCheckout({ quote, product, swatch, placement, blank, selection }) {
  const [address, setAddress] = useState(emptyAddress)
  const [price, setPrice] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [placed, setPlaced] = useState(null)

  const { design, busy: rendering } = usePrintDesign({
    slug: quote.slug,
    productId: selection.productId,
    color: selection.color,
    size: selection.size,
    style: selection.style,
    leading: selection.leading,
    scale: selection.scale,
    credit: selection.credit,
    text: quote.text,
    author: quote.author,
  })

  const order = { ...selection, slug: quote.slug, address, text: quote.text, author: quote.author }

  async function onReview(e) {
    e.preventDefault()
    setBusy('quote')
    setError('')
    const { ok, data } = await postJson('/api/print/quote', order)
    if (ok) setPrice(data)
    else setError(data.error || 'Could not price this order.')
    setBusy('')
  }

  async function onPlace() {
    setBusy('checkout')
    setError('')
    const { ok, data } = await postJson('/api/print/checkout', order)
    if (ok && data.orderNumber) setPlaced(data)
    else setError(data.error || data.message || 'Checkout failed.')
    setBusy('')
  }

  return (
    <div className="grid gap-10 md:grid-cols-2">
      <div className="space-y-4">
        <Preview
          product={product}
          swatch={swatch}
          placement={placement}
          blank={blank}
          design={design}
          alt={quote.n ? `Quote #${quote.n} artwork` : 'Your line'}
        />
        {rendering ? <p className="text-sm text-quiet">Rendering…</p> : null}
      </div>

      <form onSubmit={onReview} className="space-y-6">
        <fieldset className="space-y-4">
          <legend className={legend}>Ship to</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map(([key, label, type]) => (
              <Row key={key} label={label}>
                <input
                  type={type}
                  required={key !== 'address2' && key !== 'state'}
                  value={address[key]}
                  onChange={(e) => setAddress((prev) => ({ ...prev, [key]: e.target.value }))}
                  className={field}
                />
              </Row>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" disabled={Boolean(busy)} className="btn disabled:opacity-50">
            {busy === 'quote' ? '…' : 'Review order'}
          </button>
          <span className="text-sm text-quiet">
            {formatPrice(product.retail)} × {selection.quantity}
          </span>
        </div>

        {price ? (
          <div className="space-y-2 border border-line p-5 text-sm">
            <p className="flex justify-between">
              <span className="text-quiet">Subtotal</span>
              <span>{formatPrice(price.subtotal, price.currency)}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-quiet">Shipping</span>
              <span>{price.estimated ? formatPrice(price.shipping, price.currency) : '—'}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-quiet">Tax</span>
              <span>{price.estimated ? formatPrice(price.tax, price.currency) : '—'}</span>
            </p>
            <p className="flex justify-between border-t border-line pt-2 text-paper">
              <span>Total</span>
              <span>{formatPrice(price.total, price.currency)}</span>
            </p>
            {!price.estimated ? (
              <p className="text-quiet">
                Shipping and tax are not connected yet, so this total is the item only.
              </p>
            ) : null}
            <button
              type="button"
              onClick={onPlace}
              disabled={Boolean(busy)}
              className="btn mt-2 disabled:opacity-50"
            >
              {busy === 'checkout' ? '…' : 'Continue to checkout'}
            </button>
          </div>
        ) : null}

        {placed ? (
          <p className="text-sm text-body">
            {placed.message || 'Your order is saved.'} Reference{' '}
            <span className="text-paper">{placed.orderNumber}</span>.
          </p>
        ) : null}
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </form>
    </div>
  )
}
