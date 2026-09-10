import PrintOrderTable from '@/components/dashboard/PrintOrderTable'
import { PageIntro } from '@/components/site/ui'
import { requireAdminPage } from '@/libs/dashboard-auth'
import { presentPrintOrder } from '@/libs/print-format'
import { listOrders, printOrdersReady } from '@/libs/print-orders'

export const metadata = { title: 'Print orders' }

export default async function AdminPrintOrdersPage() {
  await requireAdminPage()

  const orders = printOrdersReady() ? (await listOrders()).map(presentPrintOrder) : []

  return (
    <div className="space-y-8">
      <PageIntro title="Print orders">
        Every quote print order and where it sits with Printful. Open one for the full address.
      </PageIntro>
      <PrintOrderTable orders={orders} />
    </div>
  )
}
