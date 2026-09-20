'use client';

import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

export default function IntegrationsApiPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [connect, setConnect] = useState<any>(null);
  const [keys, setKeys] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [keyName, setKeyName] = useState('Producción');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [cRes, apiRes] = await Promise.all([
        fetchWithAuth('/api/settings/connect', {}),
        fetchWithAuth('/api/settings/public-api', {}),
      ]);
      if (cRes.ok) {
        const d = await cRes.json();
        setConnect(d.status);
      }
      if (apiRes.ok) {
        const d = await apiRes.json();
        setKeys(d.keys || []);
        setWebhooks(d.webhooks || []);
      } else if (apiRes.status === 403) {
        const d = await apiRes.json();
        setError(d.error || 'API no disponible en tu plan');
      }
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function startConnect() {
    setError(null);
    const res = await fetchWithAuth('/api/settings/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnPath: '/deals' }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'No se pudo iniciar Connect');
      return;
    }
    window.location.href = data.url;
  }

  async function createKey() {
    setError(null);
    setNewRawKey(null);
    const res = await fetchWithAuth('/api/settings/public-api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'api_key', name: keyName }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Error');
      return;
    }
    setNewRawKey(data.rawKey);
    setMessage(data.warning);
    await load();
  }

  async function revokeKey(id: string) {
    await fetchWithAuth(`/api/settings/public-api?kind=api_key&id=${id}`, {
      method: 'DELETE',
    });
    await load();
  }

  async function addWebhook(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetchWithAuth('/api/settings/public-api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'webhook',
        url: webhookUrl,
        events: ['deal.updated', 'deal.deposit_paid', 'lead.created', 'sale.completed'],
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Error webhook');
      return;
    }
    setWebhookUrl('');
    setMessage('Webhook creado — guarda el secret');
    await load();
  }

  async function removeWebhook(id: string) {
    await fetchWithAuth(`/api/settings/public-api?kind=webhook&id=${id}`, {
      method: 'DELETE',
    });
    await load();
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Integraciones — API y cobros</h1>
        <p className="text-gray-600 mt-1">
          Stripe Connect (depósitos de clientes), API keys v0 y webhooks salientes.
        </p>
      </div>

      {message && (
        <div className="rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="bg-white border rounded-lg p-5 space-y-3">
        <h2 className="font-semibold text-lg">Stripe Connect — cobros a clientes</h2>
        <p className="text-sm text-gray-600">
          Lo más fácil es activarlo desde el{' '}
          <a href="/deals" className="text-primary-600 underline">
            Deal desk
          </a>
          : un botón “Activar cobros ahora”. No hace falta crear nada a mano en el panel de Stripe.
        </p>
        <ul className="text-sm space-y-1">
          <li>Cuenta: {connect?.accountId || '—'}</li>
          <li>Onboarding: {connect?.onboardingComplete ? 'Listo' : 'Pendiente'}</li>
          <li>Cargos: {connect?.chargesEnabled ? 'Sí' : 'No'}</li>
          <li>Payouts: {connect?.payoutsEnabled ? 'Sí' : 'No'}</li>
        </ul>
        <button
          type="button"
          onClick={startConnect}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg"
        >
          {connect?.accountId ? 'Continuar activación' : 'Activar cobros'}
        </button>
      </section>

      <section className="bg-white border rounded-lg p-5 space-y-3">
        <h2 className="font-semibold text-lg">API pública v0</h2>
        <p className="text-sm text-gray-600">
          Autenticación: <code className="bg-gray-100 px-1">Authorization: Bearer ad_live_…</code>
          <br />
          Endpoints: <code className="bg-gray-100 px-1">/api/v0/vehicles</code>,{' '}
          <code className="bg-gray-100 px-1">/api/v0/leads</code>,{' '}
          <code className="bg-gray-100 px-1">/api/v0/deals</code>,{' '}
          <code className="bg-gray-100 px-1">/api/v0/sales</code>,{' '}
          <code className="bg-gray-100 px-1">/api/v0/appointments</code>
        </p>
        <div className="flex flex-wrap gap-2 items-end">
          <label className="text-sm">
            Nombre
            <input
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              className="mt-1 block border rounded px-3 py-2"
            />
          </label>
          <button
            type="button"
            onClick={createKey}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg"
          >
            Crear API key
          </button>
        </div>
        {newRawKey && (
          <div className="rounded bg-amber-50 border border-amber-200 p-3 text-sm break-all">
            <strong>Clave (una sola vez):</strong> {newRawKey}
          </div>
        )}
        <ul className="space-y-2 text-sm">
          {keys.map((k) => (
            <li
              key={k.id}
              className="flex flex-wrap justify-between gap-2 border rounded px-3 py-2"
            >
              <span>
                {k.name} · <code>{k.keyPrefix}…</code> · {k.active ? 'activa' : 'revocada'}
              </span>
              {k.active && (
                <button
                  type="button"
                  onClick={() => revokeKey(k.id)}
                  className="text-red-600 text-xs"
                >
                  Revocar
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white border rounded-lg p-5 space-y-3">
        <h2 className="font-semibold text-lg">Webhooks salientes</h2>
        <form onSubmit={addWebhook} className="flex flex-wrap gap-2 items-end">
          <label className="text-sm flex-1 min-w-[200px]">
            URL HTTPS
            <input
              required
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://tu-app.com/hooks/autodealers"
              className="mt-1 w-full border rounded px-3 py-2"
            />
          </label>
          <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-lg">
            Añadir
          </button>
        </form>
        <ul className="space-y-2 text-sm">
          {webhooks.map((w) => (
            <li key={w.id} className="border rounded px-3 py-2">
              <div className="flex justify-between gap-2">
                <span className="break-all">{w.url}</span>
                <button
                  type="button"
                  onClick={() => removeWebhook(w.id)}
                  className="text-red-600 text-xs shrink-0"
                >
                  Eliminar
                </button>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Eventos: {(w.events || []).join(', ')}
              </div>
              <div className="text-xs mt-1 break-all">
                Secret: <code>{w.secret}</code>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Firma: HMAC-SHA256 de <code>timestamp.body</code> en header{' '}
                <code>X-AutoDealers-Signature</code>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
