import type { Metadata } from 'next'
import { Courier_Prime, Playfair_Display } from 'next/font/google'
import './globals.css'

// Both fonts are placeholders (see CLAUDE.md) — swapping the pairing means
// changing only these two declarations; everything else reads the CSS vars.
const body = Courier_Prime({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-body',
})

const flourish = Playfair_Display({
  style: 'italic',
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-flourish',
})

export const metadata: Metadata = {
  title: 'gtfod — get the *heck out the door',
  description: 'A morning departure checklist, printed like a guest check.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${body.variable} ${flourish.variable}`}>
      <body>{children}</body>
    </html>
  )
}
