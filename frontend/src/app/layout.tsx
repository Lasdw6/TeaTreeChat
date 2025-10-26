import './globals.css'
import { Inter } from 'next/font/google'
import { Metadata } from 'next'
import ClientLayout from './ClientLayout'
import { ClerkProvider } from '@clerk/nextjs'

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
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#5B6F56',
          colorBackground: '#4E342E',
          colorText: '#D6BFA3',
          colorInputBackground: '#3a2a22',
          colorInputText: '#D6BFA3',
          colorDanger: '#ef4444',
          colorSuccess: '#5B6F56',
        },
        elements: {
          card: {
            background: '#4E342E',
            color: '#D6BFA3',
            borderRadius: '16px',
            boxShadow: '0 8px 32px 0 rgba(91,111,86,0.25)',
          },
          formButtonPrimary: {
            background: '#5B6F56',
            color: '#D6BFA3',
            fontWeight: 700,
            borderRadius: '8px',
            '&:hover': { background: '#466146' },
          },
          headerTitle: { color: '#D6BFA3' },
          headerSubtitle: { color: '#D6BFA3' },
          socialButtonsBlockButton: {
            background: '#D6BFA3',
            color: '#4E342E',
            fontWeight: 700,
            borderRadius: '8px',
            '&:hover': { background: '#bfae8c' },
          },
          formFieldInput: {
            background: '#3a2a22',
            color: '#D6BFA3',
            borderRadius: '8px',
            border: '1.5px solid #D6BFA3',
          },
          footerActionText: { color: '#D6BFA3' },
        },
      }}
    >
      <html lang="en" data-google-analytics-opt-out="">
        <body
          className={inter.className}
          suppressHydrationWarning={true}
        >
          {/* Top header removed – sign-in/up buttons now handled inside sidebar */}
          <ClientLayout>{children}</ClientLayout>
        </body>
      </html>
    </ClerkProvider>
  )
} 