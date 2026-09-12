/**
 * @jest-environment node
 */
jest.mock('@/libs/scripture-store')

import { upsertScripture, removeScripture } from '@/libs/manage-scripture'
import { themeEntries } from '@/libs/scripture-core'
import { persistScripture, readLocalScripture, readScripture } from '@/libs/scripture-store'

let catalog

beforeEach(() => {
  catalog = { secular: { 'self-worth': [{ ref: 'Sagan', text: 'Love' }] } }
  readScripture.mockImplementation(async () => catalog)
  persistScripture.mockImplementation(async (next) => {
    catalog = next
  })
  readLocalScripture.mockImplementation(() => catalog)
})

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
    await upsertScripture({ tradition: 'secular', theme: 'self-worth', ref: 'A', text: 'First' })
    await upsertScripture({ tradition: 'secular', theme: 'self-worth', ref: 'B', text: 'Second' })
    expect(themeEntries(readLocalScripture().secular['self-worth'])).toHaveLength(3)
    await removeScripture('secular', 'self-worth', 2)
    await removeScripture('secular', 'self-worth', 1)
    expect(themeEntries(readLocalScripture().secular['self-worth']).map((e) => e.ref)).toEqual(['Sagan'])
  })

  it('clears kjv when kjvText is sent empty', async () => {
    catalog = {
      christianity: {
        perseverance: [{ ref: 'R', text: 'T', alt: { kjv: { ref: 'R', text: 'K', url: null } } }],
      },
    }
    await upsertScripture({
      tradition: 'christianity',
      theme: 'perseverance',
      index: 0,
      ref: 'R',
      text: 'T',
      kjvText: '',
    })
    expect(themeEntries(catalog.christianity.perseverance)[0].alt).toBeUndefined()
  })
})
