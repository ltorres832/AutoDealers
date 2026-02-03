'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PaymentMethod {
  id: string;
  type: 'card' | 'us_bank_account';
  brand?: string;
  last4?: string;
  exp_month?: number;
  exp_year?: number;
  bank_name?: string;
  routing_number?: string;
  status?: string;
  isDefault?: boolean;
}

export default function AdvertiserBillingPageWrapper() {
  return (
    <Suspense fallback={<div className="max-w-5xl mx-auto py-8 px-4"><div className="text-center">Cargando...</div></div>}>
      <AdvertiserBillingPage />
    </Suspense>
  );
}

function AdvertiserBillingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const advertiserId = params?.id as string;

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState<'card' | 'us_bank_account' | null>(null);
  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');

  useEffect(() => {
    fetchMethods();
  }, [advertiserId]);

  async function fetchMethods() {
    try {
      setError('');
      const res = await fetch(`/api/admin/advertisers/${advertiserId}/billing/payment-methods`);
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        setError('Error al cargar métodos de pago');
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al cargar métodos de pago');
        return;
      }
      setMethods(data.paymentMethods || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar métodos de pago');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(methodType: 'card' | 'us_bank_account') {
    try {
      setAdding(methodType);
      const res = await fetch(`/api/admin/advertisers/${advertiserId}/billing/setup-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ methodType }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Error al iniciar flujo de pago');
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar flujo de pago');
    } finally {
      setAdding(null);
    }
  }

  async function handleDefault(id: string) {
    try {
      const res = await fetch(`/api/admin/advertisers/${advertiserId}/billing/payment-methods/default`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethodId: id }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchMethods();
      } else {
        setError(data.error || 'Error al actualizar método predeterminado');
      }
    } catch (err: any) {
      setError(err.message || 'Error al actualizar método predeterminado');
    }
  }

  async function handleDetach(id: string) {
    try {
      const res = await fetch(`/api/admin/advertisers/${advertiserId}/billing/payment-methods/detach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethodId: id }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchMethods();
      } else {
        setError(data.error || 'Error al eliminar método');
      }
    } catch (err: any) {
      setError(err.message || 'Error al eliminar método');
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Billing del anunciante</h1>
          <p className="text-sm text-gray-600">ID: {advertiserId}</p>
        </div>
        <Link href="/admin/advertisers" className="text-blue-600 hover:text-blue-700 text-sm font-semibold">
          ← Volver a anunciantes
        </Link>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-4">
          Método agregado correctamente.
        </div>
      )}
      {canceled && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-4">
          Flujo cancelado.
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Agregar método</h2>
        <div className="flex gap-4">
          <button
            onClick={() => handleAdd('card')}
            disabled={adding === 'card'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50"
          >
            {adding === 'card' ? 'Abriendo...' : 'Agregar tarjeta'}
          </button>
          <button
            onClick={() => handleAdd('us_bank_account')}
            disabled={adding === 'us_bank_account'}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-semibold disabled:opacity-50"
          >
            {adding === 'us_bank_account' ? 'Abriendo...' : 'Agregar cuenta bancaria'}
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-2">
          Se abrirá un flujo seguro de Stripe para guardar el método de pago en la cuenta del anunciante.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Métodos guardados</h2>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : methods.length === 0 ? (
          <p className="text-gray-600">No hay métodos guardados.</p>
        ) : (
          <div className="space-y-3">
            {methods.map((pm) => (
              <div
                key={pm.id}
                className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3"
              >
                <div className="text-sm text-gray-800">
                  {pm.type === 'card' ? (
                    <>
                      <span className="font-semibold uppercase mr-2">{pm.brand}</span>
                      <span>•••• {pm.last4}</span>
                      {pm.exp_month && pm.exp_year && (
                        <span className="ml-2 text-gray-600">
                          exp {pm.exp_month}/{pm.exp_year}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="font-semibold mr-2">{pm.bank_name || 'Cuenta bancaria'}</span>
                      <span>•••• {pm.last4}</span>
                      {pm.routing_number && <span className="ml-2 text-gray-600">RTN {pm.routing_number}</span>}
                      {pm.status && <span className="ml-2 text-gray-600">({pm.status})</span>}
                    </>
                  )}
                  {pm.isDefault && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                      Predeterminado
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm">
                  {!pm.isDefault && (
                    <button
                      onClick={() => handleDefault(pm.id)}
                      className="text-blue-600 hover:text-blue-700 font-semibold"
                    >
                      Hacer predeterminado
                    </button>
                  )}
                  <button
                    onClick={() => handleDetach(pm.id)}
                    className="text-red-600 hover:text-red-700 font-semibold"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


