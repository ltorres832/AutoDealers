import type { Metadata, Viewport } from 'next';
import '../styles/globals.css';
import '../../../../packages/shared/src/styles/brand-surface.css';
import ServerStatus from '../components/ServerStatus';
import { PlatformBrandingHead } from '@/components/PlatformBrandingHead';

const platformBrandIcon = '/brand/ad-platform-logo.png';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#E10600',
};

export const metadata: Metadata = {
  title: 'Anunciante - AutoDealers',
  description: 'Dashboard para anunciantes de AutoDealers',
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
      <body className="brand-top-accent min-h-[100dvh] overflow-x-hidden antialiased">
        <PlatformBrandingHead />
        <ServerStatus />
        {children}
      </body>
    </html>
  );
}

