'use client';

import { useState } from 'react';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

type AdminDeleteButtonProps = {
  /** URL for DELETE request (e.g. /api/admin/users/abc) */
  deleteUrl: string;
  /** Label on the button */
  label?: string;
  /** Simple confirm dialog message */
  confirmMessage?: string;
  /** If set, user must type this exact string to confirm */
  requireTypedConfirm?: string;
  /** Called after successful delete */
  onDeleted?: () => void;
  /** Called when delete fails (also shows alert if no typed confirm modal) */
  onError?: (message: string) => void;
  /** Alert after success. true = default message, string = custom, false = silent */
  successMessage?: boolean | string;
  /** Append ?permanent=true for hard delete (default: true in admin panel) */
  permanent?: boolean;
  /** Extra fetch options */
  fetchOptions?: RequestInit;
  className?: string;
  disabled?: boolean;
};

export function AdminDeleteButton({
  deleteUrl,
  label = 'Eliminar',
  confirmMessage = '¿Eliminar permanentemente? Esta acción no se puede deshacer.',
  requireTypedConfirm,
  onDeleted,
  onError,
  successMessage = true,
  permanent = true,
  fetchOptions,
  className = 'text-sm px-3 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50',
  disabled = false,
}: AdminDeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (requireTypedConfirm && typed.trim() !== requireTypedConfirm.trim()) {
      setError('El texto de confirmación no coincide.');
      return;
    }
    if (!requireTypedConfirm && !window.confirm(confirmMessage)) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let requestUrl = deleteUrl;
      if (permanent) {
        requestUrl += requestUrl.includes('?') ? '&permanent=true' : '?permanent=true';
      }
      const res = await fetchWithAuth(requestUrl, { method: 'DELETE', ...fetchOptions });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof data.error === 'string' ? data.error : 'No se pudo eliminar';
        setError(msg);
        onError?.(msg);
        if (!requireTypedConfirm) {
          alert(msg);
        }
        return;
      }
      setOpen(false);
      setTyped('');
      if (successMessage) {
        const msg =
          typeof successMessage === 'string'
            ? successMessage
            : 'Eliminado permanentemente.';
        if (!requireTypedConfirm) {
          alert(msg);
        }
      }
      onDeleted?.();
    } catch {
      const msg = 'Error de red';
      setError(msg);
      onError?.(msg);
      if (!requireTypedConfirm) {
        alert(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  if (requireTypedConfirm) {
    return (
      <>
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setTyped('');
            setError(null);
          }}
          disabled={disabled || loading}
          className={className}
        >
          {loading ? 'Eliminando…' : label}
        </button>
        {open ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
              <h3 className="text-lg font-bold text-red-800">Confirmar eliminación</h3>
              <p className="mt-2 text-sm text-gray-600">{confirmMessage}</p>
              <p className="mt-3 text-sm font-medium text-gray-700">
                Escribe <span className="font-mono text-red-700">{requireTypedConfirm}</span> para confirmar:
              </p>
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                autoFocus
              />
              {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirm()}
                  disabled={loading}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Eliminando…' : 'Eliminar definitivamente'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => void handleConfirm()}
        disabled={disabled || loading}
        className={className}
      >
        {loading ? 'Eliminando…' : label}
      </button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}

type TenantEntityDeleteProps = {
  tenantId: string;
  collection: string;
  entityId: string;
  label?: string;
  confirmMessage?: string;
  onDeleted?: () => void;
  className?: string;
};

/** Elimina documentos en subcolecciones de tenants vía API genérica admin */
export function AdminTenantEntityDeleteButton({
  tenantId,
  collection,
  entityId,
  label = 'Eliminar',
  confirmMessage,
  onDeleted,
  className,
}: TenantEntityDeleteProps) {
  const qs = new URLSearchParams({
    tenantId,
    collection,
    entityId,
  });
  return (
    <AdminDeleteButton
      deleteUrl={`/api/admin/tenant-entities?${qs.toString()}`}
      label={label}
      confirmMessage={
        confirmMessage || `¿Eliminar permanentemente este ${collection.slice(0, -1) || 'registro'}?`
      }
      onDeleted={onDeleted}
      className={className}
      permanent={false}
      successMessage={`${collection.slice(0, -1) || 'Registro'} eliminado.`}
    />
  );
}
