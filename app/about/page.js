import { PageIntro, Page } from '@/components/site/ui'
import { copy, socials } from '@/config/site'
import { buildMetadata } from '@/libs/seo'

export const metadata = buildMetadata({ title: 'About' })

export default function About() {
  return (
    <Page>
      <PageIntro title={copy.aboutLead}>{copy.aboutTeaser}</PageIntro>
      <div className="max-w-2xl space-y-5 text-body/80">
        <p>
          Quote images first. Social every day. Email only when we send a roundup. Merch when it earns a place.
          No noise — just the mark, the cards, and a reason to keep going.
        </p>
      </div>
      <div className="mt-12 flex flex-wrap gap-x-5 gap-y-2">
        {socials.map(({ href, label }) => (
          <a key={href} href={href} target="_blank" rel="noreferrer" className="nav-link">
            {label}
          </a>
        ))}
      </div>
    </Page>
  )
}
