import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pedro Martínez — Demo vendedor en vivo',
  description:
    'Cuenta demo real de Pedro Martínez: inventario, perfil público y acceso al panel de vendedor. Separada de la página estática /demo-vendedor.',
  robots: { index: false, follow: false },
  alternates: {
    canonical: '/promo/vendedor/pedro',
  },
};

export default function PedroDemoPromoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
