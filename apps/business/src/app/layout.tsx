import type { Metadata, Viewport } from 'next';
import '../styles/globals.css';
import '../../../../packages/shared/src/styles/brand-surface.css';
import { PlatformBrandingHead } from '@/components/PlatformBrandingHead';
import { PlatformVisitTracker } from '@autodealers/shared/platform-visit-tracker';

const platformBrandIcon = '/brand/ad-platform-logo.png';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#E10600',
};

export const metadata: Metadata = {
  title: 'Negocio - AutoDealers',
  description: 'Panel para negocios de servicios automotrices',
  icons: {
    icon: [{ url: platformBrandIcon, type: 'image/png' }],
    shortcut: [{ url: platformBrandIcon, type: 'image/png' }],
    apple: [{ url: platformBrandIcon, type: 'image/png' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="bg-white">
      <body className="brand-top-accent min-h-[100dvh] overflow-x-hidden bg-white text-gray-900 antialiased">
        <PlatformBrandingHead />
        <PlatformVisitTracker app="business" />
        {children}
      </body>
    </html>
  );
}
