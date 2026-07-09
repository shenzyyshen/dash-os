import type { ReactNode } from 'react'
import './globals.css'

export const metadata = {
  title: 'Dash',
  description: 'A grid-based accountability dashboard.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
