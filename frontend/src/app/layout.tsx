import './globals.css'
import { Inter } from 'next/font/google'
import { Metadata } from 'next'
import ClientLayout from './ClientLayout'
import { AuthProvider } from './AuthProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'TeaTree Chat - BYOK AI Chat Platform',
    template: '%s | TeaTree Chat'
  },
  description: 'TeaTree Chat: Bring Your Own Key AI chat platform. Access GPT, Claude, Llama, and more with your own API keys. Private, secure, and fully customizable.',
  keywords: ['AI chat', 'BYOK', 'OpenAI', 'Claude', 'Llama', 'chat interface', 'API keys', 'private AI'],
  authors: [{ name: 'Vividh Mahajan', url: 'https://vividh.lol' }],
  creator: 'Vividh Mahajan',
  publisher: 'TeaTree Chat',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://teatreechat.com',
    title: 'TeaTree Chat - BYOK AI Chat Platform',
    description: 'Bring Your Own Key AI chat platform. Access all major AI models with your own API keys.',
    siteName: 'TeaTree Chat',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TeaTree Chat - BYOK AI Chat Platform',
    description: 'Bring Your Own Key AI chat platform. Access all major AI models with your own API keys.',
    creator: '@vividhmahajan',
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
    other: [
      { url: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const themeColor = [
  { media: '(prefers-color-scheme: light)', color: '#5B6F56' },
  { media: '(prefers-color-scheme: dark)', color: '#4E342E' },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-google-analytics-opt-out="">
      <body 
        className={inter.className}
        suppressHydrationWarning={true}
      >
        <AuthProvider>
          <ClientLayout>{children}</ClientLayout>
        </AuthProvider>
      </body>
    </html>
  )
} 