'use client';

import Link from 'next/link';
import PublicBackButton from '@/components/PublicBackButton';
import VinPlatformSearch from '@/components/VinPlatformSearch';

export default function VinLookupPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex flex-wrap items-center gap-3">
          <PublicBackButton className="text-primary-600 hover:underline font-medium">
            ← Volver
          </PublicBackButton>
          <span className="text-gray-300">|</span>
          <h1 className="text-lg font-bold text-gray-900">Buscar vehículo por VIN</h1>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-gray-600 mb-6">
          Escanea el código del VIN o pégalo para ver si ese vehículo está publicado en la
          plataforma — fotos, precio y ficha completa.
        </p>
        <VinPlatformSearch variant="standalone" />
        <p className="mt-6 text-sm text-gray-500">
          También puedes buscar por marca o modelo en el{' '}
          <Link href="/" className="text-primary-600 hover:underline font-medium">
            inicio
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
