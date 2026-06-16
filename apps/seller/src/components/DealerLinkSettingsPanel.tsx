'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRealtimeDealerSellerLinks } from '@/hooks/useRealtimeDealerSellerLinks';
import { DealerInviteBanner } from '@/components/DealerInviteBanner';
import { JoinDealerInlineCard } from '@/components/JoinDealerInlineCard';

async function refreshSessionAfterLinkChange() {
  try {
    const { refreshAuthToken } = await import('@/lib/token-refresh');
    await refreshAuthToken();
  } catch {
    /* ignore */
  }
  window.location.reload();
}

export function DealerLinkSettingsPanel({
  userId,
  dealerId,
}: {
  userId?: string;
  dealerId?: string;
}) {
  const { links, activeLink, pendingInvites, loading } = useRealtimeDealerSellerLinks(userId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function disconnect() {
    if (!confirm('¿Desvincular tu cuenta del concesionario?')) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/dealer-seller-links/disconnect', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'No se pudo desvincular');
        return;
      }
      if (data.refreshSession) await refreshSessionAfterLinkChange();
    } catch {
      setError('Error de red');
    } finally {
      setBusy(false);
    }
  }

  const linked = Boolean(dealerId && (activeLink?.status === 'accepted' || dealerId));

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Concesionario</h1>
        <p className="text-gray-600">
          Vincula tu cuenta independiente con un dealer o gestiona la conexión activa.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {!dealerId && pendingInvites.length > 0 && (
        <DealerInviteBanner userId={userId} dealerId={dealerId} />
      )}

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : linked ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">Vinculado a</p>
          <h2 className="text-xl font-semibold text-gray-900">{activeLink?.dealerName}</h2>
          <p className="text-sm text-gray-600 mt-3">
            Tu cuenta sigue siendo independiente. El acceso premium depende del plan del concesionario.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void disconnect()}
            className="mt-6 text-sm font-medium text-red-600 hover:text-red-800"
          >
            Desvincular
          </button>
        </div>
      ) : !pendingInvites.length ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-sm text-gray-600">
          Sin vínculo activo. Un concesionario debe invitarte por email desde su panel de vendedores.
        </div>
      ) : null}

      {!dealerId && !pendingInvites.length && !linked && (
        <div className="mt-6">
          <JoinDealerInlineCard />
        </div>
      )}

      {links.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Historial</h3>
          <ul className="space-y-2 text-sm">
            {links.map((l) => (
              <li key={l.id} className="flex justify-between border-b border-gray-100 py-2">
                <span>{l.dealerName}</span>
                <span className="text-gray-500">{l.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-6 text-sm">
        <Link href="/settings" className="text-primary-700 hover:text-primary-800">
          ← Volver a configuración
        </Link>
      </p>
    </div>
  );
}
