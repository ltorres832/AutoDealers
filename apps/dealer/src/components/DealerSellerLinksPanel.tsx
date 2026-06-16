'use client';

import { useState } from 'react';
import {
  useRealtimeDealerSellerLinks,
  type DealerSellerLinkRow,
} from '@/hooks/useRealtimeDealerSellerLinks';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  accepted: 'Vinculado',
  rejected: 'Rechazado',
  cancelled: 'Cancelado',
  revoked: 'Revocado',
};

function statusClass(status: string) {
  switch (status) {
    case 'pending':
      return 'bg-amber-100 text-amber-800';
    case 'accepted':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export function DealerSellerLinksPanel({ dealerTenantId }: { dealerTenantId?: string }) {
  const { links, loading, error } = useRealtimeDealerSellerLinks(dealerTenantId);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [inviteCode, setInviteCode] = useState<{ code: string; joinUrl: string } | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);

  async function loadInviteCode() {
    setCodeLoading(true);
    try {
      const res = await fetch('/api/dealer-seller-invite-code', { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setInviteCode(data.inviteCode ? { code: data.inviteCode.code, joinUrl: data.inviteCode.joinUrl } : null);
      }
    } finally {
      setCodeLoading(false);
    }
  }

  async function rotateInviteCode() {
    setCodeLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/dealer-seller-invite-code', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({ type: 'err', text: data.error || 'No se pudo generar el código' });
        return;
      }
      setInviteCode({ code: data.inviteCode.code, joinUrl: data.inviteCode.joinUrl });
      setFeedback({ type: 'ok', text: 'Código listo. Compártelo con el vendedor.' });
    } finally {
      setCodeLoading(false);
    }
  }

  async function deactivateCode() {
    setCodeLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/dealer-seller-invite-code', {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({ type: 'err', text: data.error || 'No se pudo desactivar' });
        return;
      }
      setInviteCode(null);
      setFeedback({ type: 'ok', text: 'Código desactivado.' });
    } finally {
      setCodeLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/dealer-seller-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({ type: 'err', text: data.error || 'No se pudo enviar la invitación' });
        return;
      }
      setFeedback({ type: 'ok', text: 'Invitación enviada. El vendedor la verá en tiempo real.' });
      setEmail('');
      setMessage('');
    } catch {
      setFeedback({ type: 'err', text: 'Error de red' });
    } finally {
      setSubmitting(false);
    }
  }

  async function runAction(link: DealerSellerLinkRow, action: 'cancel' | 'revoke') {
    setActionId(link.id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/dealer-seller-links/${link.id}/${action}`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({ type: 'err', text: data.error || 'Acción fallida' });
        return;
      }
      setFeedback({
        type: 'ok',
        text: action === 'cancel' ? 'Invitación cancelada' : 'Vinculación revocada',
      });
    } catch {
      setFeedback({ type: 'err', text: 'Error de red' });
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Vincular vendedor existente</h2>
      <p className="text-sm text-gray-600 mb-4">
        Invita a un vendedor que ya tiene cuenta propia. Mantienen su tenant y página web; heredan tu plan
        al aceptar.
      </p>

      <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Invitación por código / link</p>
            <p className="text-xs text-gray-600">
              Comparte este link con el vendedor. Él entra en seller y acepta la invitación con el código.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void rotateInviteCode()}
              disabled={codeLoading}
              className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-black disabled:opacity-50"
            >
              {inviteCode ? 'Rotar código' : 'Generar código'}
            </button>
            <button
              type="button"
              onClick={() => void loadInviteCode()}
              disabled={codeLoading}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium hover:bg-white disabled:opacity-50"
            >
              Recargar
            </button>
            {inviteCode && (
              <button
                type="button"
                onClick={() => void deactivateCode()}
                disabled={codeLoading}
                className="px-3 py-1.5 rounded-lg border border-red-300 text-red-700 text-xs font-medium hover:bg-red-50 disabled:opacity-50"
              >
                Desactivar
              </button>
            )}
          </div>
        </div>
        {inviteCode ? (
          <div className="mt-3 text-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-gray-500">Código</p>
                <p className="font-mono text-base">{inviteCode.code}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-xs text-gray-500">Link</p>
                <a className="text-xs text-primary-700 hover:text-primary-800" href={inviteCode.joinUrl}>
                  {inviteCode.joinUrl}
                </a>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-xs text-gray-500">Aún no hay código activo.</p>
        )}
      </div>

      {feedback && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            feedback.type === 'ok'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {feedback.text}
        </div>
      )}

      <form onSubmit={handleInvite} className="grid gap-3 md:grid-cols-2 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email del vendedor</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            placeholder="vendedor@ejemplo.com"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje (opcional)</label>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            placeholder="Únete a nuestro equipo"
          />
        </div>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={submitting}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {submitting ? 'Enviando…' : 'Enviar invitación'}
          </button>
        </div>
      </form>

      <h3 className="text-sm font-semibold text-gray-900 mb-2">Invitaciones y vínculos</h3>
      {loading ? (
        <p className="text-sm text-gray-500">Cargando…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : links.length === 0 ? (
        <p className="text-sm text-gray-500">No hay invitaciones aún.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2 pr-4">Vendedor</th>
                <th className="py-2 pr-4">Estado</th>
                <th className="py-2 pr-4">Actualizado</th>
                <th className="py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <tr key={link.id} className="border-b border-gray-100">
                  <td className="py-3 pr-4">
                    <div className="font-medium text-gray-900">{link.sellerName || link.sellerEmail}</div>
                    <div className="text-xs text-gray-500">{link.sellerEmail}</div>
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(link.status)}`}
                    >
                      {STATUS_LABEL[link.status] || link.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-gray-600">{link.updatedAt.toLocaleString()}</td>
                  <td className="py-3">
                    {link.status === 'pending' && (
                      <button
                        type="button"
                        disabled={actionId === link.id}
                        onClick={() => void runAction(link, 'cancel')}
                        className="text-amber-700 hover:text-amber-900 text-xs font-medium"
                      >
                        Cancelar
                      </button>
                    )}
                    {link.status === 'accepted' && (
                      <button
                        type="button"
                        disabled={actionId === link.id}
                        onClick={() => void runAction(link, 'revoke')}
                        className="text-red-600 hover:text-red-800 text-xs font-medium"
                      >
                        Revocar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
