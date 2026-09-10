import { appConfig } from '@/config/app'
import { logError } from '@/libs/logger'
import { formatPrice } from '@/libs/print-format'
import { sendEmail } from '@/libs/resend'

/**
 * Order acknowledgement. Never throws: the order is already saved by the time
 * this runs, so a mail outage must not turn a successful checkout into an error
 * the customer sees.
 */
export async function sendPrintOrderEmail(order, { total, message } = {}) {
  const item = `${order.productId} · ${order.color} · ${order.size} × ${order.quantity}`
  const amount = formatPrice(total ?? order.retailPrice * order.quantity, order.currency)

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>We've got your order</h2>
      <p>Reference <strong>${order.orderNumber}</strong></p>
      <p>${item}<br>${amount}</p>
      ${message ? `<p>${message}</p>` : ''}
      <p style="color:#666;font-size:13px;">Reply to this email if anything looks wrong.</p>
    </div>
  `

  try {
    return await sendEmail({
      to: order.customer.email,
      subject: `Your ${appConfig.name} order ${order.orderNumber}`,
      html,
      text: `We've got your order ${order.orderNumber}. ${item}. ${amount}.${message ? ` ${message}` : ''}`,
    })
  } catch (error) {
    logError('Print order email failed', error, { orderNumber: order.orderNumber })
    return null
  }
}
