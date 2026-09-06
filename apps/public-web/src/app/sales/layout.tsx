import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Empleados de ventas',
  robots: { index: false, follow: false, nocache: true },
};

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
