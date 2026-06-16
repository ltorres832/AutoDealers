'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import FIAdvancedClientForm, {
  type FIAdvancedClientFormData,
} from '@/components/FIAdvancedClientForm';
import { fiClientToFormData, formDataToClientUpdates } from '@/lib/fi-client-payload';
import { isValidSsn } from '@autodealers/core/fi-ssn';
import type { FIClient } from '@autodealers/crm';

export default function EditFIClientPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.clientId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [client, setClient] = useState<FIClient | null>(null);
  const [initialData, setInitialData] = useState<Partial<FIAdvancedClientFormData> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/fi/clients/${clientId}`, { credentials: 'include' });
        if (!res.ok) {
          router.push('/fi');
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setClient(data.client);
        setInitialData(fiClientToFormData(data.client));
      } catch {
        if (!cancelled) router.push('/fi');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId, router]);

  async function handleSave(formData: FIAdvancedClientFormData) {
    if (formData.ssn && !isValidSsn(formData.ssn)) {
      alert('SSN inválido. Use el formato XXX-XX-XXXX (9 dígitos).');
      return;
    }
    setSaving(true);
    try {
      const updates = formDataToClientUpdates(formData);
      const res = await fetch(`/api/fi/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al guardar');
      }
      alert('Cliente actualizado correctamente.');
      router.push('/fi');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al guardar cliente';
      alert(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !initialData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando cliente…</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href="/fi" className="text-primary-600 hover:text-primary-700 text-sm">
          ← Volver a F&I
        </Link>
      </div>

      <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h1 className="text-2xl font-bold text-gray-900">Editar cliente F&I</h1>
        <p className="text-sm text-amber-800 mt-1">
          {client?.name} — Actualice datos personales, SSN completo, vehículo y trade-in.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <FIAdvancedClientForm
          key={clientId}
          initialData={initialData}
          submitLabel="Guardar cambios"
          onComplete={handleSave}
        />
        {saving && (
          <p className="text-sm text-gray-500 mt-4 text-center">Guardando cambios…</p>
        )}
      </div>
    </div>
  );
}
