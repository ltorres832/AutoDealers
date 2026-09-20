'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import type { InventoryAlliance } from '@autodealers/inventory/client';

export default function InventoryAlliancesPage() {
  const enabled = useFeatureFlag('inventory_alliances');
  const [alliances, setAlliances] = useState<InventoryAlliance[]>([]);
  const [alliedVehicles, setAlliedVehicles] = useState<
    Array<{ id: string; year?: number; make?: string; model?: string; price?: number; alliedFromName?: string }>
  >([]);
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<{ tenantId: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    const res = await fetchWithAuth('/api/inventory-alliances?vehicles=1', {});
    const json = await res.json();
    if (res.ok) {
      setAlliances(json.alliances || []);
      setAlliedVehicles(json.alliedVehicles || []);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function lookup() {
    setBusy(true);
    setError('');
    try {
      const res = await fetchWithAuth('/api/inventory-alliances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lookup', query }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      setFound({ tenantId: json.tenantId, name: json.name });
    } catch (err) {
      setFound(null);
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function invite() {
    if (!found) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetchWithAuth('/api/inventory-alliances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'invite', toTenantId: found.tenantId, shareAll: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      setMessage('Invitación enviada. El otro dealer debe aceptar.');
      setFound(null);
      setQuery('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function respond(allianceId: string, accept: boolean) {
    setBusy(true);
    try {
      const res = await fetchWithAuth('/api/inventory-alliances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'respond', allianceId, accept }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl space-y-4">
      <Link href="/inventory" className="text-sm text-slate-600 hover:underline">
        ← Inventario
      </Link>
      <h1 className="text-2xl font-bold">Alianzas de inventario</h1>
      <p className="text-sm text-slate-600">
        Comparte tu inventario con otro dealer. Ellos lo ven como “de [tu nombre]”. No editan tus unidades.
        Distinto de Multi-dealer / membresía.
      </p>
      {!enabled ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">Activa `inventory_alliances` en feature flags.</div>
      ) : null}
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      {message ? <div className="text-sm text-green-700">{message}</div> : null}

      <div className="bg-white border rounded-xl p-4 space-y-3">
        <p className="font-medium text-sm">Invitar dealer (email o tenant ID)</p>
        <div className="flex gap-2 flex-wrap">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 border rounded-lg px-3 py-2"
            placeholder="dealer@email.com o id"
          />
          <button type="button" disabled={busy} onClick={() => void lookup()} className="px-3 py-2 border rounded-lg text-sm">
            Buscar
          </button>
        </div>
        {found ? (
          <div className="flex items-center justify-between gap-2 text-sm border rounded-lg p-3">
            <span>
              {found.name} <code className="text-xs">{found.tenantId}</code>
            </span>
            <button type="button" disabled={busy} onClick={() => void invite()} className="px-3 py-2 bg-slate-900 text-white rounded-lg text-sm">
              Invitar
            </button>
          </div>
        ) : null}
      </div>

      <div className="bg-white border rounded-xl p-4 space-y-3">
        <h2 className="font-semibold">Inventario recibido de alianzas</h2>
        <p className="text-xs text-slate-500">
          Solo lectura. También aparece en Inventario → Multi-dealer / alianzas.
        </p>
        {alliedVehicles.length === 0 ? (
          <p className="text-sm text-slate-500">Ninguna unidad compartida contigo aún.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {alliedVehicles.map((v) => (
              <li key={`${v.alliedFromName}-${v.id}`} className="border-b pb-2">
                <span className="font-medium">
                  {[v.year, v.make, v.model].filter(Boolean).join(' ') || v.id}
                </span>
                {v.price != null ? (
                  <span className="text-slate-600"> · ${Number(v.price).toLocaleString()}</span>
                ) : null}
                <div className="text-xs text-slate-500">De: {v.alliedFromName || 'Dealer aliado'}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white border rounded-xl p-4 space-y-3">
        <h2 className="font-semibold">Tus alianzas</h2>
        {alliances.length === 0 ? <p className="text-sm text-slate-500">Ninguna aún.</p> : null}
        {alliances.map((a) => (
          <div key={a.id} className="border-b pb-3 text-sm space-y-1">
            <p>
              {a.fromTenantId} → {a.toTenantName || a.toTenantId} · <strong>{a.status}</strong>
            </p>
            {a.status === 'pending' ? (
              <div className="flex gap-2">
                <button type="button" className="px-2 py-1 border rounded" onClick={() => void respond(a.id, true)}>
                  Aceptar
                </button>
                <button type="button" className="px-2 py-1 border rounded" onClick={() => void respond(a.id, false)}>
                  Rechazar / Revocar
                </button>
              </div>
            ) : (
              <button type="button" className="px-2 py-1 border rounded text-xs" onClick={() => void respond(a.id, false)}>
                Revocar
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
