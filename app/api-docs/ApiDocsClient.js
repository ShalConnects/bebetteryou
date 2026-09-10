'use client'

import { useEffect, useState } from 'react'
import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'

import { Page } from '@/components/site/ui'

function ApiDocsShell({ children }) {
  return (
    <Page className="api-docs">
      <h1 className="heading mb-10">API Documentation</h1>
      {children}
    </Page>
  )
}

export default function ApiDocsClient() {
  const [spec, setSpec] = useState(null)

  useEffect(() => {
    fetch('/api/docs')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(setSpec)
      .catch(() => setSpec(false))
  }, [])

  if (spec === null) {
    return (
      <ApiDocsShell>
        <p className="text-quiet">Loading API documentation…</p>
      </ApiDocsShell>
    )
  }

  if (!spec) {
    return (
      <ApiDocsShell>
        <p className="text-quiet">API documentation is unavailable.</p>
      </ApiDocsShell>
    )
  }

  return (
    <ApiDocsShell>
      <SwaggerUI spec={spec} />
    </ApiDocsShell>
  )
}
