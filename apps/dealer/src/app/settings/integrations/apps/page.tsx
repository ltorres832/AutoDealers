'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

export default function IntegrationAppsPage() {
  const [catalog, setCatalog] = useState<any>(null);
  const [apps, setApps] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [secretOnce, setSecretOnce] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    type: 'zapier',
    targetUrl: '',
    events: [] as string[],
  });

  async function load() {
    const res = await fetchWithAuth('/api/integrations/apps', {});
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Error');
      return;
    }
    setCatalog(data.catalog);
    setApps(data.apps || []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function register(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSecretOnce(null);
    const res = await fetchWithAuth('/api/integrations/apps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'register',
        name: form.name,
        type: form.type,
        targetUrl: form.targetUrl,
        events: form.events.length ? form.events : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Error');
      return;
    }
    setSecretOnce(data.webhookSecret || null);
    setForm({ name: '', type: 'zapier', targetUrl: '', events: [] });
    await load();
  }

  function toggleEvent(id: string) {
    setForm((f) => ({
      ...f,
      events: f.events.includes(id) ? f.events.filter((x) => x !== id) : [...f.events, id],
    }));
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
      <div>
        <Link href="/settings/integrations" className="text-sm text-primary-600 underline">
          ← Integraciones
        </Link>
        <h1 className="text-3xl font-bold mt-2">Apps y webhooks</h1>
        <p className="text-gray-600 mt-1">
          Zapier, Make, apps propias o sync DMS legacy. Firma:{' '}
          <code className="text-xs">X-AutoDealers-Signature</code>.
        </p>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {secretOnce && (
        <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          Guarda el secret ahora (solo se muestra una vez):{' '}
          <code className="break-all">{secretOnce}</code>
        </div>
      )}

      <form onSubmit={register} className="bg-white border rounded-lg p-5 space-y-3">
        <input
          required
          placeholder="Nombre de la app"
          className="w-full border rounded px-3 py-2"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <select
          className="w-full border rounded px-3 py-2"
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
        >
          {(catalog?.partners || []).map((p: any) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <input
          required
          placeholder="URL webhook (https://…)"
          className="w-full border rounded px-3 py-2"
          value={form.targetUrl}
          onChange={(e) => setForm((f) => ({ ...f, targetUrl: e.target.value }))}
        />
        <div className="text-sm space-y-1">
          <div className="font-medium">Eventos (vacío = todos)</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {(catalog?.events || []).map((ev: any) => (
              <label key={ev.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.events.includes(ev.id)}
                  onChange={() => toggleEvent(ev.id)}
                />
                {ev.label}{' '}
                <span className="text-gray-400 text-xs">({ev.category})</span>
              </label>
            ))}
          </div>
        </div>
        <button type="submit" className="bg-primary-600 text-white rounded-lg px-4 py-2">
          Registrar app
        </button>
      </form>

      <div className="space-y-2">
        <h2 className="font-semibold">Conectadas</h2>
        {apps.length === 0 && <p className="text-sm text-gray-500">Ninguna aún.</p>}
        {apps.map((a) => (
          <div key={a.id} className="bg-white border rounded-lg px-4 py-3 flex justify-between gap-2">
            <div>
              <div className="font-medium">
                {a.name} · {a.type} · {a.status}
              </div>
              <div className="text-xs text-gray-500">{(a.events || []).join(', ')}</div>
            </div>
            {a.status === 'active' ? (
              <button
                type="button"
                className="text-sm px-3 py-1 border rounded"
                onClick={async () => {
                  await fetchWithAuth('/api/integrations/apps', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'pause', id: a.id }),
                  });
                  await load();
                }}
              >
                Pausar
              </button>
            ) : (
              <button
                type="button"
                className="text-sm px-3 py-1 border rounded"
                onClick={async () => {
                  await fetchWithAuth('/api/integrations/apps', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'resume', id: a.id }),
                  });
                  await load();
                }}
              >
                Reanudar
              </button>
            )}
          </div>
        ))}
      </div>

      <p className="text-sm text-gray-500">
        También:{' '}
        <Link href="/settings/integrations/api" className="text-primary-600 underline">
          API pública v0
        </Link>
      </p>
    </div>
  );
}
