import Link from 'next/link'
import { notFound } from 'next/navigation'
import PrintOrderActions from '@/components/dashboard/PrintOrderActions'
import { DashPage } from '@/components/dashboard/ui'
import { Button } from '@/components/ui/button'
import { requireAdminPage } from '@/libs/dashboard-auth'
import { formatPrintOrderDate, formatStatus, presentPrintOrder } from '@/libs/print-format'
import { findOrder, printOrdersReady } from '@/libs/print-orders'

export const metadata = { title: 'Print order' }

export default async function AdminPrintOrderPage({ params }) {
  await requireAdminPage()
  const { orderNumber } = await params
  const raw = printOrdersReady() ? await findOrder(decodeURIComponent(orderNumber)) : null
  if (!raw) notFound()
  const order = presentPrintOrder(raw)

  return (
    <DashPage
      title={order.orderNumber}
      description={`${formatStatus(order.status)}${order.createdAt ? ` · ${formatPrintOrderDate(order.createdAt)}` : ''}`}
      actions={
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/print-orders">All orders</Link>
        </Button>
      }
    >

      <div className="flex items-start gap-6">
        {order.artSrc ? (
          <a href={order.printFileUrl || order.artSrc} target="_blank" rel="noreferrer">
            <img src={order.artSrc} alt="" className="h-32 w-24 object-contain" />
          </a>
        ) : null}
        <div className="space-y-2 text-sm text-quiet">
          <p className="text-paper">{order.itemLabel}</p>
          <p>{order.totalLabel}</p>
          {order.quoteHref ? (
            <p>
              <Link href={order.quoteHref} className="underline">
                {order.quoteSlug}
              </Link>
            </p>
          ) : (
            <p>{order.quoteSlug}</p>
          )}
          <p>{order.customerName}</p>
          {order.customerEmail ? (
            <p>
              <a href={`mailto:${order.customerEmail}`} className="underline">
                {order.customerEmail}
              </a>
            </p>
          ) : null}
          {order.shipTo ? <p>{order.shipTo}</p> : null}
          {order.printfulOrderId ? <p>Printful {order.printfulOrderId}</p> : null}
          {order.failureReason ? <p className="text-red-400">{order.failureReason}</p> : null}
          <div className="pt-2">
            <PrintOrderActions order={order} />
          </div>
        </div>
      </div>
    </DashPage>
  )
}
