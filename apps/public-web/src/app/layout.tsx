import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import '../../../../packages/shared/src/styles/brand-surface.css';
import { PlatformBrandingHead } from '@/components/PlatformBrandingHead';
import { PublicWebNotificationBootstrap } from '@/components/PublicWebNotificationBootstrap';
import PublicVisitTracker from '@/components/PublicVisitTracker';
import MetaPixel from '@/components/MetaPixel';
import { MetaPixelHead } from '@/components/MetaPixelHead';

const inter = Inter({ subsets: ['latin'] });

import { resolvePublicWebUrl } from '@autodealers/shared/platform-urls';

const metadataBaseUrl =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL?.trim()) ||
  resolvePublicWebUrl();

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#E10600',
};

/** Nombre nuevo = URL distinta → evita caché del PNG viejo en navegador/CDN */
const platformBrandIcon = '/brand/ad-platform-logo.png';

const googleSiteVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();

export const metadata: Metadata = {
  metadataBase: new URL(metadataBaseUrl),
  title: {
    default: 'AutoDealersOnline | La Mejor Plataforma de Venta de Vehículos',
    template: '%s | AutoDealersOnline'
  },
  description: 'Conectamos compradores con los mejores concesionarios certificados del país. Encuentra tu auto ideal en nuestro amplio inventario en tiempo real.',
  keywords: ['autos', 'vehículos', 'venta', 'compra', 'concesionario', 'usados', 'nuevos'],
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  ...(googleSiteVerification
    ? { verification: { google: googleSiteVerification } }
    : {}),
  icons: {
    icon: [
      { url: platformBrandIcon, type: 'image/png', sizes: '32x32' },
      { url: platformBrandIcon, type: 'image/png', sizes: '16x16' },
    ],
    shortcut: [{ url: platformBrandIcon, type: 'image/png' }],
    apple: [{ url: platformBrandIcon, type: 'image/png', sizes: '180x180' }],
  },
  openGraph: {
    title: 'AutoDealersOnline | La Mejor Plataforma de Venta de Vehículos',
    description: 'Conectamos compradores con los mejores concesionarios certificados del país.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // SUPRIMIR TODOS LOS ERRORES DE FIREBASE ANTES DE QUE SE CARGUE CUALQUIER CÓDIGO
              (function() {
                const originalError = console.error;
                const originalWarn = console.warn;
                
                console.error = function(...args) {
                  const message = args[0]?.toString() || '';
                  if (message.includes('Firebase') || 
                      message.includes('auth/invalid-credential') ||
                      message.includes('auth/') ||
                      args.some(arg => typeof arg === 'object' && arg?.code?.includes('auth'))) {
                    return;
                  }
                  originalError.apply(console, args);
                };
                
                console.warn = function(...args) {
                  const message = args[0]?.toString() || '';
                  if (message.includes('Firebase') || message.includes('auth/')) {
                    return;
                  }
                  originalWarn.apply(console, args);
                };
                
                window.addEventListener('error', function(event) {
                  if (event.message?.includes('Firebase') || 
                      event.message?.includes('auth/invalid-credential') ||
                      event.message?.includes('auth/')) {
                    event.preventDefault();
                    event.stopPropagation();
                    return false;
                  }
                }, true);
                
                window.addEventListener('unhandledrejection', function(event) {
                  const message = event.reason?.message || event.reason?.toString() || '';
                  if (message.includes('Firebase') || 
                      message.includes('auth/invalid-credential') ||
                      message.includes('auth/')) {
                    event.preventDefault();
                    return false;
                  }
                });
              })();
            `,
          }}
        />
        <MetaPixelHead />
      </head>
      <body className={`${inter.className} brand-top-accent min-h-[100dvh] overflow-x-hidden antialiased`}>
        <PlatformBrandingHead />
        <PublicWebNotificationBootstrap />
        <PublicVisitTracker />
        <MetaPixel />
        {children}
      </body>
    </html>
  );
}





