import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import SellerLayoutWrapper from './layout-wrapper';
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
  title: 'AutoDealers - Dashboard Vendedor',
  description: 'Dashboard para vendedores',
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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const cookies = document.cookie.split(';');
                  const authTokenCookie = cookies.find(c => c.trim().startsWith('authToken='));
                  if (authTokenCookie) {
                    const tokenValue = decodeURIComponent(authTokenCookie.split('=')[1] || '');
                    if (tokenValue && tokenValue.length < 200) {
                      try {
                        const decoded = atob(tokenValue);
                        const sessionData = JSON.parse(decoded);
                        if (sessionData.role && sessionData.role !== 'seller') {
                          document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                          document.cookie = 'authToken=; path=/seller; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                          document.cookie = 'authToken=; path=/advertiser; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                          document.cookie = 'authToken=; path=/admin; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                          if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
                            window.location.href = '/login';
                          }
                        }
                      } catch(e) {
                        document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                        document.cookie = 'authToken=; path=/seller; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                        document.cookie = 'authToken=; path=/advertiser; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                        document.cookie = 'authToken=; path=/admin; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                      }
                    }
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.className} min-h-[100dvh] overflow-x-hidden antialiased`}>
        <PlatformBrandingHead />
        <SellerLayoutWrapper>{children}</SellerLayoutWrapper>
      </body>
    </html>
  );
}



