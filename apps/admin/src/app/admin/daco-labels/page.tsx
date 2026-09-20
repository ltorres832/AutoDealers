'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DacoLabelsAdminPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    warrantyNote: '',
    footerNote: '',
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/daco-label', { credentials: 'include' });
        if (!res.ok) throw new Error('No se pudo cargar');
        const data = await res.json();
        setForm({
          warrantyNote: data.warrantyNote || '',
          footerNote: data.footerNote || '',
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/admin/daco-label', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      if (data.settings) {
        setForm({
          warrantyNote: data.settings.warrantyNote || '',
          footerNote: data.settings.footerNote || '',
        });
      }
      setMessage('Notas de etiqueta DACO guardadas.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/admin/settings/integrations" className="text-primary-600 hover:text-primary-700 mb-4 inline-block text-sm">
        ← Integraciones
      </Link>
      <h1 className="text-2xl font-bold mb-2">Etiquetas DACO (imprimibles)</h1>
      <p className="text-sm text-gray-600 mb-8">
        Texto legal / garantía que aparece en las etiquetas imprimibles del dealer (QR + ficha). Se guarda en{' '}
        <code className="text-xs">system_settings/daco_label</code>. Un dealer puede sobreescribir en{' '}
        <code className="text-xs">tenants/&#123;id&#125;/settings/daco_label</code>.
      </p>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}
      {message ? (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {message}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nota de garantía / legal</label>
            <textarea
              value={form.warrantyNote}
              onChange={(e) => setForm((f) => ({ ...f, warrantyNote: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Garantía según política del concesionario…"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Pie de etiqueta (opcional)</label>
            <textarea
              value={form.footerNote}
              onChange={(e) => setForm((f) => ({ ...f, footerNote: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Ej. AutoDealers · Informativo"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm disabled:opacity-60"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}
