'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { AdminSupportEnterButton } from '@/components/AdminSupportEnterButton';

interface AdminOption {
  id: string;
  name: string;
  email: string;
}

interface Advertiser {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  website?: string;
  industry?: string;
  status: string;
  plan: string | null;
  registrationSource?: string;
  createdByName?: string;
  assignedAdminId?: string;
  assignedAdminName?: string;
  createdAt?: string;
}

function formatOrigin(advertiser: Advertiser) {
  if (advertiser.registrationSource === 'self') return 'Auto-registro';
  if (advertiser.createdByName) return `Admin: ${advertiser.createdByName}`;
  if (advertiser.registrationSource === 'admin') return 'Creado por admin';
  return '—';
}

export default function AdvertiserDetailPage() {
  const params = useParams();
  const advertiserId = params?.id as string;

  const [advertiser, setAdvertiser] = useState<Advertiser | null>(null);
  const [admins, setAdmins] = useState<AdminOption[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    async function load() {
      if (!advertiserId) return;
      setLoading(true);
      setError('');
      try {
        const [advRes, adminsRes] = await Promise.all([
          fetchWithAuth(`/api/admin/advertisers/${advertiserId}`, { cache: 'no-store' }),
          fetchWithAuth('/api/admin/advertisers/admins'),
        ]);

        if (advRes.status === 404) {
          setError('Anunciante no encontrado');
          setAdvertiser(null);
          return;
        }

        const advData = await advRes.json();
        if (!advRes.ok) {
          setError(advData?.error || 'Error al cargar el anunciante');
          return;
        }

        setAdvertiser(advData.advertiser);
        setSelectedAdminId(advData.advertiser?.assignedAdminId || '');

        if (adminsRes.ok) {
          const adminsData = await adminsRes.json();
          setAdmins(adminsData.admins || []);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error al cargar el anunciante');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [advertiserId]);

  async function updateStatus(newStatus: 'active' | 'suspended' | 'pending' | 'cancelled') {
    if (!advertiserId) return;
    setActionLoading(true);
    setActionMessage('');
    setError('');
    try {
      const res = await fetchWithAuth(`/api/admin/advertisers/${advertiserId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'No se pudo actualizar el estado');
      }

      setActionMessage('Estado actualizado correctamente');
      setAdvertiser((prev) => (prev ? { ...prev, status: newStatus } : prev));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al actualizar el estado');
    } finally {
      setActionLoading(false);
    }
  }

  async function saveAssignment() {
    if (!advertiserId) return;
    setActionLoading(true);
    setActionMessage('');
    setError('');
    try {
      const res = await fetchWithAuth(`/api/admin/advertisers/${advertiserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedAdminId: selectedAdminId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'No se pudo asignar el anunciante');
      }
      setAdvertiser(data.advertiser);
      setSelectedAdminId(data.advertiser?.assignedAdminId || '');
      setActionMessage('Responsable asignado correctamente');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al asignar');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Detalle del anunciante</h1>
          <p className="text-gray-600">Información, asignación y acciones</p>
        </div>
        <Link
          href="/admin/advertisers"
          className="text-primary-600 hover:text-primary-700 text-sm font-semibold"
        >
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
              <div>
                <dt className="text-gray-500">Origen</dt>
                <dd className="text-gray-900">{formatOrigin(advertiser)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Responsable asignado</dt>
                <dd className="text-gray-900">{advertiser.assignedAdminName || 'Sin asignar'}</dd>
              </div>
              {advertiser.phone && (
                <div>
                  <dt className="text-gray-500">Teléfono</dt>
                  <dd className="text-gray-900">{advertiser.phone}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500">Estado</dt>
                <dd className="text-gray-900 capitalize">{advertiser.status}</dd>
              </div>
              {advertiser.createdAt && (
                <div>
                  <dt className="text-gray-500">Creado</dt>
                  <dd className="text-gray-900">
                    {new Date(advertiser.createdAt).toLocaleString('es-ES')}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Asignar responsable</h2>
            <p className="text-sm text-gray-600 mb-3">
              El administrador asignado recibe notificación y puede dar seguimiento a esta cuenta.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={selectedAdminId}
                onChange={(e) => setSelectedAdminId(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Sin asignar</option>
                {admins.map((admin) => (
                  <option key={admin.id} value={admin.id}>
                    {admin.name} ({admin.email})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={saveAssignment}
                disabled={actionLoading}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {actionLoading ? 'Guardando…' : 'Guardar asignación'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Acciones rápidas</h2>
            <div className="flex flex-wrap gap-3 items-center">
              <AdminSupportEnterButton
                advertiserId={advertiser.id}
                label="Entrar al panel (soporte)"
              />
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
              <Link
                href={`/admin/advertisers/${advertiser.id}/ads/create`}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold"
              >
                Crear anuncio
              </Link>
              <Link
                href={`/admin/advertisers/${advertiser.id}/billing`}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold"
              >
                Billing
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
