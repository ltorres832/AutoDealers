import type { Metadata } from 'next';
import '../styles/globals.css';
import ServerStatus from '../components/ServerStatus';

export const metadata: Metadata = {
  title: 'Anunciante - AutoDealers',
  description: 'Dashboard para anunciantes de AutoDealers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <ServerStatus />
        {children}
      </body>
    </html>
  );
}

