/** Daily social slot. Cron runs once, at 14:00 UTC. */

export const POST_HOUR_UTC = 14

function pad(n) {
  return String(n).padStart(2, '0')
}

/** Calendar date of a UTC instant, as `YYYY-MM-DD`. */
export function utcDateInput(date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

/** 14:00 UTC on a `YYYY-MM-DD` calendar date. */
export function slotOnDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? '').trim())
  if (!match) throw new Error('Pick a date')
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const when = new Date(Date.UTC(year, month - 1, day, POST_HOUR_UTC, 0, 0, 0))
  if (
    Number.isNaN(when.getTime()) ||
    when.getUTCFullYear() !== year ||
    when.getUTCMonth() + 1 !== month ||
    when.getUTCDate() !== day
  ) {
    throw new Error('Pick a date')
  }
  return when
}

/** Earliest `YYYY-MM-DD` whose 14:00 UTC is still ahead. */
export function nextPostDate(now = new Date()) {
  const today = slotOnDate(utcDateInput(now))
  if (today.getTime() <= now.getTime()) today.setUTCDate(today.getUTCDate() + 1)
  return utcDateInput(today)
}

/**
 * Date from the picker, or the UTC date of an ISO timestamp, pinned to 14:00 UTC.
 * Rejects a day whose slot has already passed.
 */
export function runAtFromPostDate(value, now = new Date()) {
  const raw = String(value ?? '').trim()
  const date = /^(\d{4}-\d{2}-\d{2})/.exec(raw)?.[1]
  if (!date) throw new Error('Pick a date')
  const when = slotOnDate(date)
  if (when.getTime() <= now.getTime()) throw new Error('That day’s post time has already passed')
  return when
}
