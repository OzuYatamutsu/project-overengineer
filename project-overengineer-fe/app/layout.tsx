import './globals.css'
import { Inter } from 'next/font/google'

export const metadata = {
  title: 'Receipt Parser',
  description: 'Converts receipt images into structured, itemized text.',
}

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.variable}>{children}</body>
    </html>
  )
}
