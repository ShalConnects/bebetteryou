import PrintOrderTable from '@/components/dashboard/PrintOrderTable'
import { DashPage, DashPanel } from '@/components/dashboard/ui'
import { requireAdminPage } from '@/libs/dashboard-auth'
import { presentPrintOrder } from '@/libs/print-format'
import { listOrders, printOrdersReady } from '@/libs/print-orders'

export const metadata = { title: 'Print orders' }

export default async function AdminPrintOrdersPage() {
  await requireAdminPage()

  const orders = printOrdersReady() ? (await listOrders()).map(presentPrintOrder) : []

  return (
    <DashPage title="Shop" description="Every print order and where it sits with Printful. Open one for the full address.">
      <DashPanel>
        <PrintOrderTable orders={orders} />
      </DashPanel>
    </DashPage>
  )
}
