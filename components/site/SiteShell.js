import Analytics from './Analytics'
import Footer from './Footer'
import Header from './Header'
import TraditionPrompt from './TraditionPrompt'

export default function SiteShell({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-ink">
      <Header />
      <main className="flex flex-1 flex-col">{children}</main>
      <Footer />
      <TraditionPrompt />
      <Analytics />
    </div>
  )
}
