import type { Metadata, Viewport } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import '../../../../packages/shared/src/styles/brand-surface.css';
import { AuthProvider } from './auth-provider';
import { BrandingHead } from '@/components/BrandingHead';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#E10600',
};

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
});

const platformBrandIcon = '/brand/ad-platform-logo.png';

export const metadata: Metadata = {
  title: 'AutoDealers - Panel Administrativo',
  description: 'Panel administrativo supremo de AutoDealers',
  icons: {
    icon: [
      { url: platformBrandIcon, type: 'image/png', sizes: '32x32' },
      { url: platformBrandIcon, type: 'image/png', sizes: '16x16' },
    ],
    shortcut: [{ url: platformBrandIcon, type: 'image/png' }],
    apple: [{ url: platformBrandIcon, type: 'image/png', sizes: '180x180' }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${inter.variable} ${poppins.variable}`}>
      <body className={`${inter.className} brand-top-accent font-sans antialiased min-h-[100dvh] overflow-x-hidden`}>
        <BrandingHead />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

