import { upsertScripture, removeScripture } from '@/libs/manage-scripture'
import { themeEntries } from '@/libs/scripture-core'
import { readLocalScripture } from '@/libs/scripture-store'

describe('manage-scripture validation', () => {
  it('rejects invalid tradition', async () => {
    await expect(
      upsertScripture({ tradition: 'invalid', theme: 'perseverance', ref: 'R', text: 'T' })
    ).rejects.toThrow('Invalid tradition')
  })

  it('rejects invalid theme', async () => {
    await expect(
      upsertScripture({ tradition: 'secular', theme: 'invalid', ref: 'R', text: 'T' })
    ).rejects.toThrow('Invalid theme')
  })

  it('requires reference and text', async () => {
    await expect(
      upsertScripture({ tradition: 'secular', theme: 'perseverance', ref: '', text: 'T' })
    ).rejects.toThrow('Reference and text required')
  })

  it('appends and removes by index', async () => {
    const before = themeEntries(readLocalScripture().secular?.['self-worth']).length
    await upsertScripture({ tradition: 'secular', theme: 'self-worth', ref: 'A', text: 'First' })
    await upsertScripture({ tradition: 'secular', theme: 'self-worth', ref: 'B', text: 'Second' })
    expect(themeEntries(readLocalScripture().secular?.['self-worth'])).toHaveLength(before + 2)
    await removeScripture('secular', 'self-worth', before + 1)
    await removeScripture('secular', 'self-worth', before)
  })
})
