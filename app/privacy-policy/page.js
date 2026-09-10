import { LegalPage } from '@/components/site/ui'
import { appConfig } from '@/config/app'
import { buildMetadata } from '@/libs/seo'

export const metadata = buildMetadata({ title: 'Privacy Policy' })

export default function PrivacyPolicy() {
  return (
    <LegalPage title="Privacy Policy">
      <section>
        <h2>Information We Collect</h2>
        <p>
          We collect information you provide directly to us, such as when you create an account, make a
          purchase, or contact us for support.
        </p>
      </section>
      <section>
        <h2>How We Use Your Information</h2>
        <p>
          We use the information we collect to provide, maintain, and improve our services, process
          transactions, and communicate with you.
        </p>
      </section>
      <section>
        <h2>Personalization</h2>
        <p>
          If you choose a spiritual tradition, we store that optional preference locally and in your account when
          signed in, only to show related passages on quotes. You can change or turn off passages anytime. We do not
          sell or share this preference.
        </p>
      </section>
      <section>
        <h2>Information Sharing</h2>
        <p>
          We do not sell, trade, or otherwise transfer your personal information to third parties without
          your consent, except as described in this policy.
        </p>
      </section>
      <section>
        <h2>Data Security</h2>
        <p>
          We implement appropriate security measures to protect your personal information against unauthorized
          access, alteration, disclosure, or destruction.
        </p>
      </section>
      <section>
        <h2>Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us at{' '}
          <a href={`mailto:${appConfig.supportEmail}`}>{appConfig.supportEmail}</a>.
        </p>
      </section>
    </LegalPage>
  )
}
