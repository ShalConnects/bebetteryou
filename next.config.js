/** Hostnames from SITE_URL for next/image (build-time). */
function siteImageHosts() {
  const raw = process.env.SITE_URL || process.env.NEXTAUTH_URL
  if (!raw) return []
  try {
    const { hostname, protocol } = new URL(raw)
    if (!hostname || hostname === 'localhost') return []
    const p = protocol.replace(':', '')
    return hostname.startsWith('www.')
      ? [{ protocol: p, hostname }]
      : [
          { protocol: p, hostname },
          { protocol: p, hostname: `www.${hostname}` },
        ]
  } catch {
    return []
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  staticPageGenerationTimeout: 180,
  serverExternalPackages: ['@napi-rs/canvas', '@napi-rs/canvas-win32-x64-msvc'],
  // Quote + print renderers need fonts (and card layers) in the serverless bundle
  outputFileTracingIncludes: {
    '/api/quotes/**': ['./assets/**/*', './public/brand/**/*'],
    '/api/print/**': ['./assets/fonts/**/*'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : config.externals ? [config.externals] : []),
        ({ request }, callback) => {
          if (request === '@napi-rs/canvas' || request?.startsWith('@napi-rs/canvas-')) {
            return callback(null, `commonjs ${request}`)
          }
          callback()
        },
      ]
    }
    return config
  },
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: 'localhost' },
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      ...siteImageHosts(),
    ],
  },
}

// Sentry only when DSN is configured (keeps local/CI builds lean)
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  const { withSentryConfig } = require('@sentry/nextjs')
  module.exports = withSentryConfig(
    nextConfig,
    {
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
    },
    {
      widenClientFileUpload: true,
      transpileClientSDK: true,
      tunnelRoute: '/monitoring',
      hideSourceMaps: true,
      disableLogger: true,
      automaticVercelMonitors: true,
    }
  )
} else {
  module.exports = nextConfig
}
