export default function AuthCard({ title, children, footer }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm space-y-6 border border-line p-8">
        {title ? <h1 className="heading-sm text-center">{title}</h1> : null}
        {children}
        {footer}
      </div>
    </main>
  )
}
