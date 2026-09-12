import { traditions, traditionIds } from '@/config/traditions'
import { readTags } from '@/libs/tags-store'
import { tagForThemeMap, themeSet, themesMap } from '@/libs/tag-lane'
import { readScripture, persistScripture } from '@/libs/scripture-store'
import { themeEntries, scriptureFor } from '@/libs/scripture-core'

const editableTraditions = traditions.filter((t) => t.id !== 'none')

async function lanes() {
  const tags = await readTags()
  return { tags, map: themesMap(tags), tagForTheme: tagForThemeMap(tags), themeIds: themeSet(tags) }
}

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
  } else if (prev?.alt && !('kjvText' in (raw || {}))) entry.alt = prev.alt
  return entry
}

function entryRow(tradition, theme, entry, index, tagForTheme) {
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
  const [{ tagForTheme }, data] = await Promise.all([lanes(), readScripture()])
  return Object.entries(data).flatMap(([tradition, themes]) =>
    Object.entries(themes || {}).flatMap(([theme, raw]) =>
      themeEntries(raw).map((entry, index) => entryRow(tradition, theme, entry, index, tagForTheme))
    )
  )
}

export async function scriptureGaps() {
  const [{ tagForTheme, themeIds }, data] = await Promise.all([lanes(), readScripture()])
  return editableTraditions.flatMap(({ id, label }) =>
    [...themeIds].flatMap((theme) => {
      if (themeEntries(data[id]?.[theme]).length) return []
      return [{ tradition: id, label, theme, tag: tagForTheme[theme] || theme }]
    })
  )
}

export async function previewScripture({ tradition, slug, tags, n, translationId, theme }) {
  const { map } = await lanes()
  return scriptureFor(await readScripture(), tradition, tags, slug ?? n, translationId, theme, map)
}

export async function upsertScripture(body) {
  const { tradition, theme, ref, text, url, index, kjvRef, kjvText, kjvUrl } = body || {}
  if (!traditionIds.has(tradition) || tradition === 'none') throw new Error('Invalid tradition')
  const { themeIds } = await lanes()
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
  const { themeIds } = await lanes()
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

/** Theme options for admin UI — one row per theme from live catalog. */
export async function scriptureThemeOptions() {
  const { tags } = await lanes()
  const byTheme = new Map()
  for (const t of tags) {
    if (t.theme && !byTheme.has(t.theme)) {
      byTheme.set(t.theme, { tag: t.name, theme: t.theme, label: `${t.name} (${t.theme})` })
    }
  }
  return [...byTheme.values()]
}
