'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { loadCurrentSellerUser } from '@/lib/current-seller-user';

type PreviewResult =
  | { valid: false; error?: string }
  | { valid: true; dealerName: string; dealerTenantId: string; message?: string };

async function refreshSession() {
  try {
    const { refreshAuthToken } = await import('@/lib/token-refresh');
    await refreshAuthToken();
  } catch {
    /* ignore */
  }
  window.location.href = '/settings/dealer-link';
}

function JoinDealerPageInner() {
  const searchParams = useSearchParams();
  const rawCode = searchParams.get('code') || '';
  const code = useMemo(() => rawCode.trim().toUpperCase(), [rawCode]);

  const [userId, setUserId] = useState<string | null>(null);
  const [dealerId, setDealerId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadCurrentSellerUser().then((u) => {
      setUserId(u?.id || null);
      setDealerId(u?.dealerId ? String(u.dealerId) : null);
    });
  }, []);

  useEffect(() => {
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/join-dealer/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        const data = (await res.json().catch(() => null)) as PreviewResult | null;
        if (!data || !res.ok) {
          setPreview({ valid: false, error: 'Código inválido o expirado.' });
          return;
        }
        setPreview(data);
      } catch {
        setPreview({ valid: false, error: 'No se pudo validar el código.' });
      } finally {
        setLoading(false);
      }
    }
    if (code) void run();
    else {
      setPreview({ valid: false, error: 'Falta el código.' });
      setLoading(false);
    }
  }, [code]);

  async function join() {
    setJoining(true);
    setError(null);
    try {
      const res = await fetch('/api/join-dealer/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'No se pudo aceptar la invitación.');
        return;
      }
      if (data.refreshSession) {
        await refreshSession();
      }
    } catch {
      setError('Error de red');
    } finally {
      setJoining(false);
    }
  }

  if (dealerId) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-2">Ya estás vinculado a un concesionario</h1>
        <p className="text-gray-600 mb-4">
          Primero desvincula tu cuenta en <strong>Configuración → Concesionario</strong> para poder unirte
          a otro dealer.
        </p>
        <Link className="text-primary-700 hover:text-primary-800" href="/settings/dealer-link">
          Ir a Concesionario →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Unirte a un concesionario</h1>
      <p className="text-gray-600 mb-6">
        Usa el código que te compartió el dealer para vincular tu cuenta.
      </p>

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : preview?.valid ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">Concesionario</p>
          <h2 className="text-xl font-semibold">{preview.dealerName}</h2>
          <p className="text-sm text-gray-600 mt-3">
            Tu cuenta seguirá siendo independiente. El acceso premium dependerá del plan del concesionario.
          </p>
          {preview.message ? (
            <p className="text-sm text-gray-700 mt-3 italic">&ldquo;{preview.message}&rdquo;</p>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          ) : null}

          {!userId ? (
            <div className="mt-5 text-sm text-gray-700">
              Debes iniciar sesión como vendedor para aceptar.
              <div className="mt-3">
                <Link href="/login" className="text-primary-700 hover:text-primary-800 font-medium">
                  Ir a iniciar sesión →
                </Link>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={joining}
              onClick={() => void join()}
              className="mt-6 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {joining ? 'Aceptando…' : 'Aceptar y vincular'}
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {preview?.error || 'Código inválido.'}
        </div>
      )}

      <p className="mt-6 text-sm">
        <Link href="/settings" className="text-primary-700 hover:text-primary-800">
          ← Volver
        </Link>
      </p>
    </div>
  );
}

export default function JoinDealerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      }
    >
      <JoinDealerPageInner />
    </Suspense>
  );
}

