import { FROM_ADDRESS, outreachLetter, selectBatch } from './letter.js'
import { deliverEmail } from './deliver.js'
import {
  acquireSendLock,
  addContact,
  addUnsubscribe,
  appendRemoved,
  clearContactSent,
  dailyCap,
  day,
  deleteContact,
  getStatus,
  importPeople,
  listContacts,
  loadAudience,
  loadSentEmails,
  loadStoppedEmails,
  markSent,
  releaseSendLock,
  resubscribeContact,
  sendGapMs,
  updateContact,
  updateSendProgress,
  getSendProgress,
} from './store.js'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function previewBatch() {
  const status = await getStatus()
  const [sent, stopped] = await Promise.all([loadSentEmails(), loadStoppedEmails()])
  const blocked = new Set([...sent.map((s) => s.email), ...stopped])
  const { ShalOutreachContact } = await import('@/models/ShalOutreach')
  // Small window only — full 178k load made the dashboard crawl.
  const rows = await ShalOutreachContact.find({})
    .sort({ createdAt: 1 })
    .limit(800)
    .select({ email: 1, name: 1, _id: 0 })
    .lean()
  const candidates = rows.filter((r) => !blocked.has(r.email))
  const used = sent.filter((s) => s.day === day()).length
  const batch = selectBatch(candidates, [], Math.max(0, dailyCap() - used))
  const letter = outreachLetter({ name: batch[0]?.name })
  return {
    ...status,
    listMissing: status.listMissing,
    batchSize: Math.min(status.roomToday, status.remaining),
    nextEmails: batch.slice(0, 5).map((p) => p.email),
    subject: letter.subject,
    text: letter.text,
    html: letter.html,
  }
}

export async function sendSelfTest() {
  const letter = outreachLetter()
  const data = await deliverEmail(FROM_ADDRESS, letter)
  return { to: FROM_ADDRESS, id: data?.id || null, subject: letter.subject }
}

export async function sendTodayBatch() {
  const owner = await acquireSendLock()
  const started = Date.now()
  let ok = 0
  let failures = []
  let attempted = 0
  let finalPhase = 'done'
  try {
    await updateSendProgress(owner, {
      phase: 'preparing',
      total: 0,
      done: 0,
      failed: 0,
      currentEmail: '',
      lastError: '',
      etaSeconds: null,
    })

    const { people, listMissing } = await loadAudience()
    if (listMissing) throw new Error('List missing. Import CSV first.')

    const sent = await loadSentEmails()
    const stopped = await loadStoppedEmails()
    const used = sent.filter((s) => s.day === day()).length
    const batch = selectBatch(
      people,
      [...sent.map((s) => s.email), ...stopped],
      Math.max(0, dailyCap() - used)
    )
    attempted = batch.length
    const gap = sendGapMs()
    // Rough ETA before first send (~0.9s/email + gap).
    const seedAvg = 900 + gap
    await updateSendProgress(owner, {
      phase: batch.length ? 'sending' : 'done',
      total: batch.length,
      done: 0,
      failed: 0,
      avgMs: seedAvg,
      etaSeconds: batch.length ? Math.ceil((batch.length * seedAvg) / 1000) : 0,
      finishedAt: batch.length ? null : new Date(),
    })

    for (let i = 0; i < batch.length; i += 1) {
      const person = batch[i]
      const tick = Date.now()
      try {
        await updateSendProgress(owner, {
          phase: 'sending',
          currentEmail: person.email,
          done: ok,
          failed: failures.length,
        })
        await deliverEmail(person.email, outreachLetter({ name: person.name }))
        await markSent(person.email)
        ok += 1
        const elapsed = Date.now() - started
        const avgMs = Math.max(200, Math.round(elapsed / ok))
        const left = batch.length - ok
        await updateSendProgress(owner, {
          phase: 'sending',
          done: ok,
          failed: failures.length,
          avgMs,
          etaSeconds: Math.ceil((left * avgMs) / 1000),
          currentEmail: person.email,
        })
        if (gap && i < batch.length - 1) await sleep(gap)
      } catch (error) {
        finalPhase = 'error'
        failures.push({ email: person.email, error: error.message })
        await appendRemoved([{ email: person.email, reason: 'send-failed' }])
        await updateSendProgress(owner, {
          phase: 'error',
          done: ok,
          failed: failures.length,
          lastError: error.message,
          currentEmail: person.email,
          etaSeconds: 0,
          finishedAt: new Date(),
        })
        break
      }
    }

    if (finalPhase === 'done') {
      await updateSendProgress(owner, {
        phase: 'done',
        done: ok,
        failed: 0,
        etaSeconds: 0,
        currentEmail: '',
        finishedAt: new Date(),
      })
    }

    return {
      sent: ok,
      attempted,
      failures,
      durationMs: Date.now() - started,
      progress: await getSendProgress(),
      status: await getStatus(),
    }
  } catch (error) {
    finalPhase = 'error'
    await updateSendProgress(owner, {
      phase: 'error',
      lastError: error.message || 'Send failed',
      finishedAt: new Date(),
      etaSeconds: 0,
    }).catch(() => null)
    throw error
  } finally {
    await releaseSendLock(owner, {
      phase: finalPhase,
      done: ok,
      failed: failures.length,
      total: attempted,
      finishedAt: new Date(),
      etaSeconds: 0,
      currentEmail: '',
      lastError: failures[0]?.error || '',
    }).catch(() => null)
  }
}

export async function importCsv(csv, { confirmedOptIn, mode = 'merge' } = {}) {
  if (!confirmedOptIn) throw new Error('Confirm opt-in before importing.')
  if (!String(csv || '').trim()) throw new Error('Paste emails or choose a CSV file.')
  const importMode = mode === 'replace' ? 'replace' : 'merge'
  const result = await importPeople(csv, { mode: importMode })
  return {
    total: result.peopleCount,
    upserted: result.upserted,
    mode: importMode,
    invalidCount: result.invalidCount,
    duplicateCount: result.duplicateCount,
    status: await getStatus(),
  }
}

export async function unsubscribeEmail(email) {
  const result = await addUnsubscribe(email, 'manual')
  if (!result.email?.includes('@')) throw new Error('Enter a valid email to unsubscribe.')
  return { ...result, status: await getStatus() }
}

export async function listOutreachContacts(opts) {
  return listContacts(opts)
}

export async function createOutreachContact(body) {
  const contact = await addContact(body)
  return { contact, status: await getStatus() }
}

export async function patchOutreachContact(body) {
  const contact = await updateContact(body)
  return { contact, status: await getStatus() }
}

export async function removeOutreachContact(email) {
  const result = await deleteContact(email)
  return { ...result, status: await getStatus() }
}

export async function resetOutreachSent(email) {
  const result = await clearContactSent(email)
  return { ...result, status: await getStatus() }
}

export async function restoreOutreachContact(email) {
  const result = await resubscribeContact(email)
  return { ...result, status: await getStatus() }
}

export { getStatus, getSendProgress, outreachLetter }
