'use client'

import { traditions, translationsFor } from '@/config/traditions'
import TraditionPicker from './TraditionPicker'
import { useTradition } from './TraditionProvider'

/** First run it asks; once a tradition is set the same dialog is the settings panel. */
export default function TraditionPrompt() {
  const {
    promptOpen,
    tradition,
    showPassages,
    translation,
    syncError,
    pick,
    dismiss,
    togglePassages,
    setTranslationPref,
  } = useTradition()
  if (!promptOpen) return null

  const chosen = traditions.find((t) => t.id === tradition)?.label
  const translations = translationsFor(tradition)

  return (
    <div className="tradition-modal" role="dialog" aria-labelledby="tradition-title" aria-modal="true">
      <button type="button" className="tradition-modal-backdrop" aria-label="Close" onClick={dismiss} />
      <div className="tradition-modal-panel shell-inner">
        <p id="tradition-title" className="font-display text-lg text-paper md:text-xl">
          {chosen ? 'Your tradition' : 'Personalize motivation with words from your tradition?'}
        </p>
        <p className="mt-2 text-sm text-body/80">
          {chosen
            ? `Currently ${chosen} — pick another to change it.`
            : "Optional — we'll show a related passage on Motivation quotes."}
        </p>
        <div className="mt-5">
          <TraditionPicker onPick={pick} active={tradition} />
        </div>
        {tradition && tradition !== 'none' ? (
          <>
            {translations.length ? (
              <label className="mt-5 block text-sm text-body/85">
                <span className="mb-2 block text-xs text-quiet">Translation</span>
                <select
                  value={translation}
                  onChange={(e) => setTranslationPref(e.target.value)}
                  className="w-full border border-line bg-ink px-3 py-2 text-paper outline-none focus:border-paper/40"
                >
                  {translations.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-body/85">
              <input type="checkbox" checked={showPassages} onChange={togglePassages} className="accent-paper" />
              Show passages on quotes
            </label>
          </>
        ) : null}
        {syncError ? (
          <p className="mt-2 text-xs text-red-400">Could not sync preferences — saved on this device.</p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-4">
          {chosen ? (
            <button type="button" className="btn" onClick={dismiss}>Done</button>
          ) : (
            <>
              <button type="button" className="btn" onClick={dismiss}>Maybe later</button>
              <button type="button" className="tag" onClick={dismiss}>Skip</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
