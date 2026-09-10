'use client'

import { useState } from 'react'
import Link from 'next/link'
import PrintOrderActions from '@/components/dashboard/PrintOrderActions'
import { formatPrintOrderDate, formatStatus, printOrderFlags } from '@/libs/print-format'

export default function PrintOrderTable({ orders }) {
  const [rows, setRows] = useState(orders)
  const [copied, setCopied] = useState('')

  function onStatus(orderNumber, status) {
    setRows((prev) =>
      prev.map((row) =>
        row.orderNumber === orderNumber
          ? { ...row, status, ...printOrderFlags({ ...row, status }) }
          : row
      )
    )
  }

  async function onCopy(order) {
    if (!order.shipTo) return
    await navigator.clipboard.writeText(order.shipTo)
    setCopied(order.orderNumber)
  }

  if (!rows.length) return <p className="text-sm text-quiet">No print orders yet.</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-[0.2em] text-quiet">
            <th className="py-3 pr-4 font-normal">Order</th>
            <th className="py-3 pr-4 font-normal">Placed</th>
            <th className="py-3 pr-4 font-normal">Customer</th>
            <th className="py-3 pr-4 font-normal">Item</th>
            <th className="py-3 pr-4 font-normal">Status</th>
            <th className="py-3 pr-4 font-normal">Total</th>
            <th className="py-3 font-normal" />
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((order) => (
            <tr key={order.orderNumber}>
              <td className="py-3 pr-4">
                {order.href ? (
                  <Link href={order.href} className="text-paper underline">
                    {order.orderNumber}
                  </Link>
                ) : (
                  <p className="text-paper">{order.orderNumber}</p>
                )}
                {order.quoteHref ? (
                  <Link href={order.quoteHref} className="block text-quiet underline">
                    {order.quoteSlug}
                  </Link>
                ) : order.quoteSlug ? (
                  <span className="text-quiet">{order.quoteSlug}</span>
                ) : null}
              </td>
              <td className="py-3 pr-4 text-quiet">{formatPrintOrderDate(order.createdAt)}</td>
              <td className="py-3 pr-4 text-quiet">
                {order.customerName}
                {order.customerEmail ? (
                  <>
                    <br />
                    <a href={`mailto:${order.customerEmail}`} className="underline">
                      {order.customerEmail}
                    </a>
                  </>
                ) : null}
                {order.locality ? (
                  <>
                    <br />
                    {order.locality}
                  </>
                ) : null}
                {order.shipTo ? (
                  <>
                    <br />
                    <button type="button" className="underline" onClick={() => onCopy(order)}>
                      {copied === order.orderNumber ? 'Copied' : 'Copy address'}
                    </button>
                  </>
                ) : null}
              </td>
              <td className="py-3 pr-4">
                <div className="flex items-start gap-3">
                  {order.artSrc ? (
                    <a href={order.printFileUrl || order.artSrc} target="_blank" rel="noreferrer">
                      <img src={order.artSrc} alt="" className="h-16 w-12 shrink-0 object-contain" />
                    </a>
                  ) : null}
                  <span className="text-quiet">{order.itemLabel}</span>
                </div>
              </td>
              <td className="py-3 pr-4">
                <span className={order.status === 'submit_failed' ? 'text-red-400' : 'text-quiet'}>
                  {formatStatus(order.status)}
                </span>
              </td>
              <td className="py-3 pr-4 text-quiet">{order.totalLabel}</td>
              <td className="py-3">
                <PrintOrderActions
                  order={order}
                  onStatus={(status) => onStatus(order.orderNumber, status)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
