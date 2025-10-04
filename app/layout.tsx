import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'
import Header from './components/Header'
import Footer from './components/Footer'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

const playfair = Playfair_Display({ 
  subsets: ['latin'],
  variable: '--font-playfair',
})

export const metadata: Metadata = {
  title: 'NVM Marketing - Strategic Digital Marketing Solutions',
  description: 'Transform your business with NVM Marketing. We specialize in strategic digital marketing, SEO, social media management, and brand development to drive growth and maximize ROI.',
  keywords: 'digital marketing, SEO, social media marketing, brand development, marketing strategy, business growth',
  authors: [{ name: 'NVM Marketing' }],
  creator: 'NVM Marketing',
  publisher: 'NVM Marketing',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://nvm-marketing.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'NVM Marketing - Strategic Digital Marketing Solutions',
    description: 'Transform your business with NVM Marketing. We specialize in strategic digital marketing, SEO, social media management, and brand development.',
    url: 'https://nvm-marketing.com',
    siteName: 'NVM Marketing',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'NVM Marketing - Digital Marketing Solutions',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NVM Marketing - Strategic Digital Marketing Solutions',
    description: 'Transform your business with NVM Marketing. We specialize in strategic digital marketing, SEO, social media management, and brand development.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#f27921" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <Header />
        <main>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
