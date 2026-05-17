'use client';

import { useEffect, useState } from 'react';

interface AdminQuickListing {
  id: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string | null;
  city: string | null;
  make: string;
  model: string;
  year: number;
  price: number;
  currency: string;
  photos: string[];
  status: 'active' | 'expired' | 'removed';
  views: number;
  createdAt: string | null;
  expiresAt: string | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.ceil((t - Date.now()) / (24 * 60 * 60 * 1000)));
}

export default function AdminQuickListingsPage() {
  const [items, setItems] = useState<AdminQuickListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [purging, setPurging] = useState(false);

  async function load() {
    try {
      const r = await fetch('/api/admin/quick-listings', { cache: 'no-store' });
      if (!r.ok) return;
      const j = await r.json();
      setItems((j.items || []) as AdminQuickListing[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este anuncio? El visitante perderá su publicación.')) return;
    const r = await fetch(`/api/admin/quick-listings/${id}`, { method: 'DELETE' });
    if (r.ok) {
      setItems((prev) => prev.filter((x) => x.id !== id));
    } else {
      alert('Error al eliminar');
    }
  }

  async function handlePurge() {
    setPurging(true);
    try {
      const r = await fetch('/api/admin/quick-listings', { method: 'POST' });
      const j = await r.json().catch(() => ({}));
      if (r.ok) {
        alert(`Vencidos eliminados: ${j.removed ?? 0}`);
        await load();
      } else {
        alert('Error al limpiar vencidos');
      }
    } finally {
      setPurging(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Anuncios particulares (Publicar Gratis)</h1>
          <p className="text-sm text-gray-600">
            Anuncios creados desde la home pública sin cuenta. Vencen automáticamente según la
            configuración (Settings → Publicar gratis).
          </p>
        </div>
        <button
          onClick={handlePurge}
          disabled={purging}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg disabled:opacity-50"
        >
          {purging ? 'Limpiando…' : 'Eliminar vencidos ahora'}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Cargando…</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-10 text-center text-gray-500">
          No hay anuncios particulares activos.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="text-left px-4 py-3">Vehículo</th>
                <th className="text-left px-4 py-3">Vendedor</th>
                <th className="text-left px-4 py-3">Contacto</th>
                <th className="text-left px-4 py-3">Precio</th>
                <th className="text-left px-4 py-3">Vence</th>
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const days = daysLeft(it.expiresAt);
                return (
                  <tr key={it.id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {it.photos[0] ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={it.photos[0]} alt="" className="w-12 h-12 object-cover rounded" />
                        ) : (
                          <div className="w-12 h-12 bg-slate-200 rounded" />
                        )}
                        <div>
                          <div className="font-semibold">
                            {it.year} {it.make} {it.model}
                          </div>
                          <div className="text-xs text-slate-500">{it.city || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{it.contactName}</td>
                    <td className="px-4 py-3">
                      <div>{it.contactPhone}</div>
                      {it.contactEmail && (
                        <div className="text-xs text-slate-500">{it.contactEmail}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {it.currency} {it.price.toLocaleString('en-US')}
                    </td>
                    <td className="px-4 py-3">
                      <div>{formatDate(it.expiresAt)}</div>
                      <div className="text-xs text-slate-500">
                        {days != null ? `${days} día(s) restantes` : '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(it.id)}
                        className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
