import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Jarvis SaaS Platform',
  description: 'Enterprise AI Operating System Dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
