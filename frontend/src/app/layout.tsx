import './globals.css'
import { Inter } from 'next/font/google'
import { Metadata } from 'next'
import ClientLayout from './ClientLayout'
import { AuthProvider } from './AuthProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TeaTree Chat',
  description: 'A modern chat application built with the TeaTree stack',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>
          <ClientLayout>{children}</ClientLayout>
        </AuthProvider>
      </body>
    </html>
  )
} 