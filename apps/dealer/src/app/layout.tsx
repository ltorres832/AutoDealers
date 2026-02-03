import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import DealerLayoutWrapper from './layout-wrapper';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AutoDealers - Dashboard Dealer',
  description: 'Dashboard para dealers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <DealerLayoutWrapper>{children}</DealerLayoutWrapper>
      </body>
    </html>
  );
}



