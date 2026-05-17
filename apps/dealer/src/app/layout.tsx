import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import DealerLayoutWrapper from './layout-wrapper';
import { PlatformBrandingHead } from '@/components/PlatformBrandingHead';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f9fafb',
};

const platformBrandIcon = '/brand/ad-platform-logo.png';

export const metadata: Metadata = {
  title: 'AutoDealers - Dashboard Dealer',
  description: 'Dashboard para dealers',
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
    <html lang="es">
      <body className={`${inter.className} min-h-[100dvh] overflow-x-hidden antialiased`}>
        <PlatformBrandingHead />
        <DealerLayoutWrapper>{children}</DealerLayoutWrapper>
      </body>
    </html>
  );
}



