import { Iceberg, Jost } from 'next/font/google'
import './globals.css'
import LayoutClient from '@/components/LayoutClient'
import { brand } from '@/config/site'
import { buildMetadata } from '@/libs/seo'
import '@/libs/env-validation'

const jost = Jost({
  subsets: ['latin'],
  variable: '--font-jost',
  display: 'swap',
})

const iceberg = Iceberg({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-iceberg',
  display: 'swap',
})

export const metadata = {
  ...buildMetadata(),
  icons: { icon: brand.favicon },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${jost.variable} ${iceberg.variable}`}>
      <body className="font-sans">
        <LayoutClient>{children}</LayoutClient>
      </body>
    </html>
  )
}
