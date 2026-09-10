'use client'

/** Checkbox picker for catalog tags. Manage tags at /dashboard/tags. */
export default function TagPicker({ options, value, onChange }) {
  function toggle(tag) {
    onChange(value.includes(tag) ? value.filter((t) => t !== tag) : [...value, tag])
  }

  return (
    <fieldset>
      <legend className="mb-2 text-[11px] uppercase tracking-[0.2em] text-quiet">Tags</legend>
      <div className="flex flex-wrap gap-4">
        {options.map((tag) => (
          <label key={tag} className="flex cursor-pointer items-center gap-2 text-sm text-body">
            <input type="checkbox" checked={value.includes(tag)} onChange={() => toggle(tag)} className="accent-paper" />
            {tag}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
