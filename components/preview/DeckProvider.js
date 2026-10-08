'use client'

import { createContext, useContext, useState } from 'react'

/** The card currently dealt in the hero — the shop section dresses it on a tee. */
const DeckContext = createContext(null)

export function DeckProvider({ initial, children }) {
  const [card, setCard] = useState(initial)
  /** Bumps on every deal so the same card can flip in again. */
  const [deal, setDeal] = useState(0)

  function show(next) {
    setCard(next)
    setDeal((d) => d + 1)
  }

  return <DeckContext.Provider value={{ card, deal, show }}>{children}</DeckContext.Provider>
}

export function useDeck() {
  return useContext(DeckContext)
}
