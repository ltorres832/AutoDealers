'use client';

import dynamic from 'next/dynamic';

const CatalogInterestClient = dynamic(() => import('./CatalogInterestClient'), {
  ssr: false,
  loading: () => (
    <div className="container mx-auto px-4 py-12 text-gray-500" role="status">
      Cargando…
    </div>
  ),
});

/** Evita hidratacion rota en App Hosting; el cliente lee la URL y llama al API. */
export default function CatalogInterestPage() {
  return <CatalogInterestClient />;
}
