import type { Metadata } from 'next';
import CaribeMotorsDemoPromoClient from './CaribeMotorsDemoPromoClient';

export const metadata: Metadata = {
  title: 'Demo en vivo — Caribe Motors PR',
  description:
    'Cuenta demo real de concesionario: inventario, equipo, perfil público y acceso al panel dealer. Separada de /demo-dealer.',
  alternates: {
    canonical: '/promo/dealer/caribe',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function CaribeMotorsDemoPromoPage() {
  return <CaribeMotorsDemoPromoClient />;
}
