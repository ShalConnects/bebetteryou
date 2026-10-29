import IntegrationsPanel from '@/components/dashboard/IntegrationsPanel'
import { PageIntro } from '@/components/site/ui'
import { requireAdminPage } from '@/libs/dashboard-auth'
import { listIntegrationStatus } from '@/libs/integrations/status'

export const metadata = { title: 'Integrations' }
export const dynamic = 'force-dynamic'

const pinNotes = {
  connected: 'Pinterest connected. Set Board ID below if it is still empty, then post from Quotes.',
  token: 'Pinterest token exchange failed. Check app id/secret and redirect URI, then try again.',
  state: 'Pinterest connect was interrupted (bad state). Try Connect again.',
  signin: 'Sign in as admin, then connect Pinterest again.',
}

const ytNotes = {
  connected: 'YouTube connected. You can post Shorts from Quotes.',
  token: 'YouTube token exchange failed. Reconnect and allow every permission Google shows.',
  state: 'YouTube connect was interrupted (bad state). Try Connect again.',
  signin: 'Sign in as admin, then connect YouTube again.',
}

export default async function IntegrationsPage({ searchParams }) {
  await requireAdminPage()
  const params = (await searchParams) || {}
  const { social, email } = await listIntegrationStatus()

  let flash = ''
  if (params.pinterest && pinNotes[params.pinterest]) flash = pinNotes[params.pinterest]
  else if (params.pinterest) flash = `Pinterest: ${params.pinterest}`
  else if (params.youtube && ytNotes[params.youtube]) flash = ytNotes[params.youtube]
  else if (params.youtube) flash = `YouTube: ${params.youtube}`

  return (
    <>
      <PageIntro title="Integrations">
        Connect social accounts and check email providers. Tokens saved here override env when present.
      </PageIntro>
      <IntegrationsPanel initialSocial={social} initialEmail={email} flash={flash} />
    </>
  )
}
