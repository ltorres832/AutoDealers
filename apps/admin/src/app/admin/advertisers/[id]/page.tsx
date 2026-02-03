'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Advertiser {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  website?: string;
  industry?: string;
  status: string;
  plan: string;
  createdAt?: string;
}

export default function AdvertiserDetailPage() {
  const params = useParams();
  const advertiserId = params?.id as string;

  const [advertiser, setAdvertiser] = useState<Advertiser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string>('');

  useEffect(() => {
    async function load() {
      if (!advertiserId) return;
      setLoading(true);
      setError('');
      try {
        const token =
          typeof window !== 'undefined'
            ? localStorage.getItem('authToken') ||
              document.cookie
                .split(';')
                .find((c) => c.trim().startsWith('authToken='))
                ?.split('=')[1] ||
              ''
            : '';

        const res = await fetch(`/api/admin/advertisers/${advertiserId}`, {
          cache: 'no-store',
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (res.status === 404) {
          setError('Anunciante no encontrado');
          setAdvertiser(null);
          return;
        }
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error || 'Error al cargar el anunciante');
          return;
        }
        setAdvertiser(data.advertiser);
      } catch (err: any) {
        setError(err?.message || 'Error al cargar el anunciante');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [advertiserId]);

  async function updateStatus(newStatus: 'active' | 'suspended' | 'pending' | 'cancelled') {
    if (!advertiserId) return;
    setActionLoading(true);
    setActionMessage('');
    setError('');
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('authToken') ||
            document.cookie
              .split(';')
              .find((c) => c.trim().startsWith('authToken='))
              ?.split('=')[1] ||
            ''
          : '';

      const res = await fetch(`/api/admin/advertisers/${advertiserId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'No se pudo actualizar el estado');
      }

      setActionMessage('Estado actualizado correctamente');
      // Refrescar datos
      setAdvertiser((prev) => (prev ? { ...prev, status: newStatus } : prev));
    } catch (err: any) {
      setError(err?.message || 'Error al actualizar el estado');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Detalle del anunciante</h1>
          <p className="text-gray-600">Información y acciones disponibles</p>
        </div>
        <Link href="/admin/advertisers" className="text-blue-600 hover:text-blue-700 text-sm font-semibold">
          ← Volver
        </Link>
      </div>

      {loading && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Cargando anunciante...</p>
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}
      {actionMessage && !loading && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-4">
          {actionMessage}
        </div>
      )}

      {advertiser && !loading && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Información básica</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Empresa</dt>
                <dd className="text-gray-900 font-medium">{advertiser.companyName}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Contacto</dt>
                <dd className="text-gray-900 font-medium">{advertiser.contactName}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Email</dt>
                <dd className="text-gray-900">{advertiser.email}</dd>
              </div>
              {advertiser.phone && (
                <div>
                  <dt className="text-gray-500">Teléfono</dt>
                  <dd className="text-gray-900">{advertiser.phone}</dd>
                </div>
              )}
              {advertiser.website && (
                <div>
                  <dt className="text-gray-500">Sitio web</dt>
                  <dd className="text-blue-600">
                    <a href={advertiser.website} target="_blank" rel="noopener noreferrer">
                      {advertiser.website}
                    </a>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500">Industria</dt>
                <dd className="text-gray-900">{advertiser.industry || 'N/D'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Plan</dt>
                <dd className="text-gray-900 font-medium uppercase">{advertiser.plan || 'N/D'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Estado</dt>
                <dd className="text-gray-900 capitalize">{advertiser.status}</dd>
              </div>
              {advertiser.createdAt && (
                <div>
                  <dt className="text-gray-500">Creado</dt>
                  <dd className="text-gray-900">{advertiser.createdAt}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Acciones rápidas</h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => updateStatus('active')}
                disabled={actionLoading || advertiser.status === 'active'}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50"
              >
                Activar
              </button>
              <button
                onClick={() => updateStatus('suspended')}
                disabled={actionLoading || advertiser.status === 'suspended'}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold disabled:opacity-50"
              >
                Suspender
              </button>
              <button
                onClick={() => updateStatus('pending')}
                disabled={actionLoading || advertiser.status === 'pending'}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-semibold disabled:opacity-50"
              >
                Marcar pendiente
              </button>
              <button
                onClick={() => updateStatus('cancelled')}
                disabled={actionLoading || advertiser.status === 'cancelled'}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold disabled:opacity-50"
              >
                Cancelar
              </button>
              <Link
                href={`/admin/advertisers/${advertiser.id}/ads/create`}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                Crear anuncio
              </Link>
              <Link
                href={`/admin/advertisers/${advertiser.id}/billing`}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"
              >
                Billing y métodos de pago
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

