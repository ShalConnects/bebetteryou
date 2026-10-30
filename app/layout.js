import { Analytics } from '@vercel/analytics/next'
import { Amiri_Quran, Iceberg, Jost } from 'next/font/google'
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

/** Quranic Arabic with its pause marks; only fetched when a passage in `lang="ar"` shows. */
const quranic = Amiri_Quran({
  weight: '400',
  subsets: ['arabic'],
  variable: '--font-quranic',
  preload: false,
})

export const metadata = {
  ...buildMetadata(),
  icons: { icon: brand.favicon },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${jost.variable} ${iceberg.variable} ${quranic.variable}`}>
      <body className="font-sans">
        <LayoutClient>{children}</LayoutClient>
        <Analytics />
      </body>
    </html>
  )
}
