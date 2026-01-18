import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/lib/auth-provider'
import { VehicleProvider } from '@/lib/vehicle-context'
import { ThemeProvider } from '@/components/theme-provider'
import Script from 'next/script'
import './globals.css'

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: 'Digital Twin Car',
  description: 'Plateforme de surveillance des véhicules en temps réel',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={geist.className} suppressHydrationWarning>
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
        <AuthProvider>
          <VehicleProvider>
            {children}
          </VehicleProvider>
        </AuthProvider>
        </ThemeProvider>
        <Analytics />
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=maps,marker`}
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}
