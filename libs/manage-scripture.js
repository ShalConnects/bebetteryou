import { readScripture, persistScripture } from '@/libs/scripture-store'
import { tagThemes, traditions, traditionIds, themeIds } from '@/config/traditions'
import { themeEntries, scriptureFor } from '@/libs/scripture-core'

const tagForTheme = Object.fromEntries(Object.entries(tagThemes).map(([tag, theme]) => [theme, tag]))
const editableTraditions = traditions.filter((t) => t.id !== 'none')

function normalizeEntry(raw, prev) {
  const ref = String(raw?.ref ?? '').trim()
  const text = String(raw?.text ?? '').trim()
  const url = String(raw?.url ?? '').trim()
  if (!ref || !text) throw new Error('Reference and text required')
  const entry = { ref, text, url: url || null }
  const kjvText = String(raw?.kjvText ?? '').trim()
  if (kjvText) {
    entry.alt = {
      kjv: {
        ref: String(raw?.kjvRef ?? ref).trim(),
        text: kjvText,
        url: String(raw?.kjvUrl ?? '').trim() || null,
      },
    }
  } else if (prev?.alt) entry.alt = prev.alt
  return entry
}

function entryRow(tradition, theme, entry, index) {
  const kjv = entry.alt?.kjv
  return {
    tradition,
    theme,
    tag: tagForTheme[theme] || theme,
    index,
    ref: entry.ref || '',
    text: entry.text || '',
    url: entry.url || '',
    kjvRef: kjv?.ref || '',
    kjvText: kjv?.text || '',
    kjvUrl: kjv?.url || '',
  }
}

export async function listScriptureEntries() {
  const data = await readScripture()
  return Object.entries(data).flatMap(([tradition, themes]) =>
    Object.entries(themes || {}).flatMap(([theme, raw]) =>
      themeEntries(raw).map((entry, index) => entryRow(tradition, theme, entry, index))
    )
  )
}

export async function scriptureGaps() {
  const data = await readScripture()
  return editableTraditions.flatMap(({ id, label }) =>
    [...themeIds].flatMap((theme) => {
      if (themeEntries(data[id]?.[theme]).length) return []
      return [{ tradition: id, label, theme, tag: tagForTheme[theme] || theme }]
    })
  )
}

export async function previewScripture({ tradition, slug, tags, n, translationId }) {
  return scriptureFor(await readScripture(), tradition, tags, slug ?? n, translationId)
}

export async function upsertScripture(body) {
  const { tradition, theme, ref, text, url, index, kjvRef, kjvText, kjvUrl } = body || {}
  if (!traditionIds.has(tradition) || tradition === 'none') throw new Error('Invalid tradition')
  if (!themeIds.has(theme)) throw new Error('Invalid theme')

  const data = await readScripture()
  if (!data[tradition]) data[tradition] = {}
  const entries = themeEntries(data[tradition][theme])
  const i = Number(index)
  const prev = Number.isInteger(i) && i >= 0 && i < entries.length ? entries[i] : null
  const entry = normalizeEntry({ ref, text, url, kjvRef, kjvText, kjvUrl }, prev)
  if (Number.isInteger(i) && i >= 0 && i < entries.length) entries[i] = entry
  else entries.push(entry)
  data[tradition][theme] = entries
  await persistScripture(data)
  return data
}

export async function removeScripture(tradition, theme, index) {
  if (!traditionIds.has(tradition) || !themeIds.has(theme)) throw new Error('Not found')
  const data = await readScripture()
  const entries = themeEntries(data[tradition]?.[theme])
  if (!entries.length) throw new Error('Not found')
  const i = Number(index)
  if (Number.isInteger(i) && i >= 0 && i < entries.length) entries.splice(i, 1)
  else entries.length = 0
  if (entries.length) data[tradition][theme] = entries
  else {
    delete data[tradition][theme]
    if (!Object.keys(data[tradition]).length) delete data[tradition]
  }
  await persistScripture(data)
  return data
}
