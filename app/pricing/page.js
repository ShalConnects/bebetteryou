import { notFound } from 'next/navigation'
import { appConfig } from '@/config/app'
import Pricing from '@/components/Pricing'

export default function PricingPage() {
  if (!appConfig.features.enablePricing) notFound()
  return (
    <main>
      <Pricing />
    </main>
  )
}
