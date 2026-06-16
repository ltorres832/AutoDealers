'use client';

import { useState } from 'react';
import { useRealtimeDealerSellerLinks } from '@/hooks/useRealtimeDealerSellerLinks';

async function refreshSessionAfterLinkChange() {
  try {
    const { refreshAuthToken } = await import('@/lib/token-refresh');
    await refreshAuthToken();
  } catch {
    /* ignore */
  }
  window.location.reload();
}

export function DealerInviteBanner({
  userId,
  dealerId,
}: {
  userId?: string;
  dealerId?: string;
}) {
  const { pendingInvites, loading } = useRealtimeDealerSellerLinks(userId);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (loading || dealerId) return null;

  const invite = pendingInvites[0];
  if (!invite) return null;

  async function respond(linkId: string, action: 'accept' | 'reject') {
    setActionId(linkId);
    setError(null);
    try {
      const res = await fetch(`/api/dealer-seller-links/${linkId}/${action}`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'No se pudo completar la acción');
        return;
      }
      if (data.refreshSession) {
        await refreshSessionAfterLinkChange();
      }
    } catch {
      setError('Error de red');
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 shadow-sm mb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-primary-900">Invitación de concesionario</p>
          <p className="text-sm text-primary-800 mt-1">
            <strong>{invite.dealerName}</strong> quiere vincular tu cuenta. Mantienes tu página y datos;
            el acceso dependerá del plan del concesionario.
          </p>
          {invite.message ? (
            <p className="text-sm text-primary-700 mt-1 italic">&ldquo;{invite.message}&rdquo;</p>
          ) : null}
          {error ? <p className="text-sm text-red-700 mt-2">{error}</p> : null}
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            disabled={actionId === invite.id}
            onClick={() => void respond(invite.id, 'reject')}
            className="px-3 py-1.5 rounded-lg border border-primary-300 text-sm text-primary-800 hover:bg-primary-100"
          >
            Rechazar
          </button>
          <button
            type="button"
            disabled={actionId === invite.id}
            onClick={() => void respond(invite.id, 'accept')}
            className="px-3 py-1.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
