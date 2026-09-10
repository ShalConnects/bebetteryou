import fs from 'fs'
import path from 'path'
import PrintOrder from '@/models/PrintOrder'
import { connectDB, mongoUri } from './mongo'
import { sourcesOf } from './print-status'

const localFile = path.join(process.cwd(), 'data/print-orders.json')

function useMongo() {
  return Boolean(mongoUri())
}

function readLocal() {
  try {
    const parsed = JSON.parse(fs.readFileSync(localFile, 'utf8'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLocal(orders) {
  fs.writeFileSync(localFile, JSON.stringify(orders, null, 2))
}

/** Mongo when the URI is real; local JSON off Vercel, same split as the quote catalog. */
export function printOrdersReady() {
  return useMongo() || !process.env.VERCEL
}

/** Sortable, quotable to a customer, and unique enough to be Printful's dedupe key. */
export function newOrderNumber(now = Date.now()) {
  const stamp = now.toString(36).toUpperCase()
  const salt = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `BBY-${stamp}-${salt}`
}

function asDraft(fields) {
  return {
    ...fields,
    orderNumber: fields.orderNumber || newOrderNumber(),
    status: 'draft',
  }
}

/** Written before any payment call so a charge can never exist without a record. */
export async function createDraftOrder(fields) {
  const doc = asDraft(fields)
  if (useMongo()) {
    await connectDB()
    return PrintOrder.create(doc)
  }
  const row = { ...doc, _id: doc.orderNumber, createdAt: new Date().toISOString() }
  writeLocal([row, ...readLocal()])
  return row
}

export async function findOrder(orderNumber) {
  if (useMongo()) {
    await connectDB()
    return PrintOrder.findOne({ orderNumber })
  }
  return readLocal().find((order) => order.orderNumber === orderNumber) || null
}

export async function listOrders(limit = 100) {
  if (useMongo()) {
    await connectDB()
    return PrintOrder.find().sort({ createdAt: -1 }).limit(limit).lean()
  }
  return readLocal().slice(0, limit)
}

/** Thrown when the record is fine but the move is not — never worth a retry. */
function transitionError(message) {
  const error = new Error(message)
  error.transition = true
  return error
}

function finishAdvance(current, orderNumber, status) {
  if (!current) throw transitionError(`Unknown print order ${orderNumber}`)
  if (current.status === status) return current
  throw transitionError(`Illegal print order transition ${current.status} -> ${status}`)
}

/**
 * Guarded write. The status guard lives in the query itself, so two racing
 * callers — a webhook retry against an admin retry, say — cannot both pass it
 * and clobber each other. Reading first and saving after would let them.
 */
export async function advanceOrder(orderNumber, status, extra = {}) {
  if (useMongo()) {
    await connectDB()
    const updated = await PrintOrder.findOneAndUpdate(
      { orderNumber, status: { $in: sourcesOf(status) } },
      { $set: { ...extra, status } },
      { new: true }
    )
    if (updated) return updated
    return finishAdvance(await PrintOrder.findOne({ orderNumber }), orderNumber, status)
  }

  const orders = readLocal()
  const index = orders.findIndex((order) => order.orderNumber === orderNumber)
  const current = orders[index]
  if (current && sourcesOf(status).includes(current.status)) {
    orders[index] = { ...current, ...extra, status }
    writeLocal(orders)
    return orders[index]
  }
  return finishAdvance(current, orderNumber, status)
}
