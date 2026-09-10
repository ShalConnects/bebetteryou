import ButtonCheckout from './ButtonCheckout'
import { appConfig } from '@/config/app'

const plans = [
  {
    key: 'starter',
    name: 'Starter',
    price: '$0',
    period: '/month',
    description: 'Perfect for getting started',
    features: ['Up to 3 projects', 'Basic support', 'Community access', '1GB storage'],
    popular: false,
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '$29',
    period: '/month',
    description: 'Best for growing teams',
    features: [
      'Unlimited projects',
      'Priority support',
      'Advanced analytics',
      '10GB storage',
      'Team collaboration',
    ],
    popular: true,
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: '$99',
    period: '/month',
    description: 'For large organizations',
    features: [
      'Everything in Pro',
      'Custom integrations',
      'Dedicated support',
      'Unlimited storage',
      'SSO integration',
    ],
    popular: false,
  },
]

export default function Pricing() {
  const provider = appConfig.paymentProvider

  return (
    <section className="py-20 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that&apos;s right for you. Upgrade or downgrade at any time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.key}
              className={`relative bg-background border rounded-lg p-8 ${
                plan.popular ? 'border-primary shadow-lg lg:scale-105' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="text-4xl font-bold mb-2">
                  {plan.price}
                  <span className="text-lg font-normal text-muted-foreground">{plan.period}</span>
                </div>
                <p className="text-muted-foreground">{plan.description}</p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center">
                    <svg className="w-5 h-5 text-accent mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <ButtonCheckout
                priceId={appConfig.stripePrices[plan.key]}
                provider={provider}
                className="w-full"
              >
                {plan.key === 'starter' ? 'Get Started' : 'Choose Plan'}
              </ButtonCheckout>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
