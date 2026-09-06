'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { AdminSupportEnterButton } from '@/components/AdminSupportEnterButton';

export default function AdminAutomotiveBusinessesPage() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetchWithAuth('/api/admin/automotive-businesses');
    const data = await res.json();
    setBusinesses(data.businesses || []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function seed() {
    await fetchWithAuth('/api/admin/automotive-businesses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seed: true }),
    });
    alert('Categorías y planes Business sembrados si faltaban.');
  }

  async function togglePublished(tenantId: string, published: boolean) {
    await fetchWithAuth('/api/admin/automotive-businesses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, published }),
    });
    void load();
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Negocios automotrices</h1>
          <p className="text-gray-600">Talleres, gomeras y servicios. Independientes de dealers y vendedores.</p>
          <Link href="/admin/payment-applications" className="inline-block mt-2 text-sm font-semibold text-primary-700">
            Solicitudes de cobro, tarifas y acuerdo →
          </Link>
        </div>
        <button onClick={seed} className="px-4 py-2 bg-primary-600 text-white rounded-lg">
          Sembrar categorías y planes
        </button>
      </div>
      {loading ? (
        <p>Cargando...</p>
      ) : businesses.length === 0 ? (
        <p className="text-gray-500">Aún no hay negocios registrados.</p>
      ) : (
        <table className="w-full bg-white rounded-xl overflow-hidden">
          <thead className="bg-gray-50 text-left text-sm">
            <tr>
              <th className="p-3">Negocio</th>
              <th className="p-3">Categoría</th>
              <th className="p-3">Municipio</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {businesses.map((biz) => (
              <tr key={biz.id} className="border-t">
                <td className="p-3 font-medium">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 border inline-flex items-center justify-center">
                      {biz.logoUrl ? (
                        <img src={biz.logoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-gray-400">{String(biz.name || 'N').charAt(0)}</span>
                      )}
                    </span>
                    {biz.name}
                  </span>
                </td>
                <td className="p-3">{biz.categoryName || biz.categorySlug}</td>
                <td className="p-3">{biz.municipality || biz.city}</td>
                <td className="p-3">{biz.published ? 'Publicado' : 'Borrador'}</td>
                <td className="p-3">
                  <div className="flex flex-col gap-1 items-start">
                    <AdminSupportEnterButton
                      tenantId={biz.id}
                      userId={biz.ownerId || undefined}
                      label="Entrar al panel"
                      className="text-left text-xs font-medium text-amber-700 hover:underline disabled:opacity-50 bg-transparent p-0"
                    />
                    <Link
                      href={`/admin/tenants/${biz.id}`}
                      className="text-xs font-medium text-primary-700 hover:underline"
                    >
                      Ver tenant
                    </Link>
                    <button
                      className="text-sm text-primary-700"
                      onClick={() => togglePublished(biz.id, !biz.published)}
                    >
                      {biz.published ? 'Ocultar' : 'Publicar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
