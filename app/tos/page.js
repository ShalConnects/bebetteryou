import { LegalPage } from '@/components/site/ui'
import { buildMetadata } from '@/libs/seo'

export const metadata = buildMetadata({ title: 'Terms of Service' })

export default function TermsOfService() {
  return (
    <LegalPage title="Terms of Service">
      <section>
        <h2>Acceptance of Terms</h2>
        <p>
          By accessing and using this service, you accept and agree to be bound by the terms and provision of
          this agreement.
        </p>
      </section>
      <section>
        <h2>Use License</h2>
        <p>
          Permission is granted to temporarily download one copy of the materials on our website for personal,
          non-commercial transitory viewing only.
        </p>
      </section>
      <section>
        <h2>Disclaimer</h2>
        <p>
          The materials on our website are provided on an &apos;as is&apos; basis. We make no warranties,
          expressed or implied, and hereby disclaim and negate all other warranties.
        </p>
      </section>
      <section>
        <h2>Limitations</h2>
        <p>
          In no event shall our company or its suppliers be liable for any damages arising out of the use or
          inability to use the materials on our website.
        </p>
      </section>
      <section>
        <h2>Governing Law</h2>
        <p>
          These terms and conditions are governed by and construed in accordance with the laws and you
          irrevocably submit to the exclusive jurisdiction of the courts in that state or location.
        </p>
      </section>
    </LegalPage>
  )
}
