import { swaggerSpec } from '@/libs/swagger'
import { appConfig } from '@/config/app'
import { NextResponse } from 'next/server'

export async function GET() {
  if (!appConfig.features.enableApiDocs) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(swaggerSpec)
}
