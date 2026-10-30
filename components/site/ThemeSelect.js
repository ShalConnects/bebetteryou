import { themeLabel } from '@/config/themes'

/** Scripture theme picker, grouped by tag. Empty value = follow the card's tags. Passes the change event through. */
export default function ThemeSelect({ value, onChange, options = [] }) {
  const groups = options.reduce((acc, o) => ({ ...acc, [o.tag]: [...(acc[o.tag] || []), o] }), {})
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] uppercase tracking-[0.2em] text-quiet">Scripture theme</span>
      <select value={value} onChange={onChange} className="dash-select">
        <option value="">From tags</option>
        {Object.entries(groups).map(([tag, rows]) => (
          <optgroup key={tag} label={tag}>
            {rows.map((o) => (
              <option key={o.theme} value={o.theme}>
                {themeLabel(o.theme)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  )
}
