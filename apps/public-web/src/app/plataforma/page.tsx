import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PlatformShowcaseClient } from '@/components/platform-showcase/PlatformShowcaseClient';

export const metadata: Metadata = {
  title: 'Conoce la plataforma',
  description:
    'Para vendedores independientes y concesionarios: web propia, marketplace, redes, CRM, F&I, documentos e IA en un solo panel.',
  alternates: {
    canonical: '/plataforma',
  },
  openGraph: {
    title: 'Conoce la plataforma | AutoDealersOnline',
    description:
      'Todo lo que puedes hacer como vendedor o concesionario: sitio propio, marketplace, redes, CRM, documentos, voz IA y operación en un solo panel.',
    type: 'website',
    url: '/plataforma',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Conoce la plataforma | AutoDealersOnline',
    description:
      'Web propia, marketplace, redes desde el panel, equipo de vendedores y todas las herramientas para vender más.',
  },
};

export default function PlataformaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white text-gray-600">
          Cargando…
        </div>
      }
    >
      <PlatformShowcaseClient />
    </Suspense>
  );
}
