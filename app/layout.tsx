import type { Metadata } from 'next'
  import { Inter } from 'next/font/google'
  import './globals.css'

  const inter = Inter({ 
    subsets: ['latin'],
    preload: false,
    display: 'swap',
  })

  export const metadata: Metadata = {
    title: 'ISP Admin Panel',
    description: 'Admin panel for ISP client management',
  }

  export default function RootLayout({
    children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
    return (
      <html lang="en">
        <body style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }} 
        className={inter.className}>{children}</body>
      </html>
    )
  }