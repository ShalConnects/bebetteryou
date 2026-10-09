/** Heading row: title (+ optional sub) left, links right. `as="h1"` for page tops. */
export default function SectionHead({ title, sub, as: H = 'h2', children }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <H className={H === 'h1' ? 'font-display text-4xl tracking-wide text-paper md:text-5xl' : 'heading-sm'}>
          {title}
        </H>
        {sub ? <p className="lede">{sub}</p> : null}
      </div>
      {children ? <div className="flex gap-6">{children}</div> : null}
    </div>
  )
}
