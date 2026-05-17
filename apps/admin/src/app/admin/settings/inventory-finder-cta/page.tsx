'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InventoryFinderCtaSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    enabled: false,
    title: '¿No encuentras lo que buscas?',
    description: '',
    primarySmallLabel: '',
    primaryMainLabel: '',
    primaryHoverHint: '',
    primaryHref: '',
    secondaryLabel: '',
    secondaryHref: '',
    footerText: '',
    showFooterPulse: true,
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/settings/inventory-finder-cta');
        if (res.ok) {
          const data = await res.json();
          setForm({
            enabled: data.enabled === true,
            title: data.title ?? '',
            description: data.description ?? '',
            primarySmallLabel: data.primarySmallLabel ?? '',
            primaryMainLabel: data.primaryMainLabel ?? '',
            primaryHoverHint: data.primaryHoverHint ?? '',
            primaryHref: data.primaryHref ?? '',
            secondaryLabel: data.secondaryLabel ?? '',
            secondaryHref: data.secondaryHref ?? '',
            footerText: data.footerText ?? '',
            showFooterPulse: data.showFooterPulse !== false,
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings/inventory-finder-cta', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.config) setForm(data.config);
        alert('Guardado. Activa la sección y define al menos el enlace del botón principal para que funcione.');
        router.refresh();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Error al guardar');
      }
    } catch {
      alert('Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">CTA “¿No encuentras…?” (listado de vehículos)</h1>
      <p className="text-sm text-gray-600 mb-8">
        Bloque debajo del catálogo en la home. Por defecto está <strong>desactivado</strong>. El botón oscuro antes era solo
        decorativo (no hacía nada); aquí debes indicar una <strong>ruta</strong> (p. ej. <code className="text-xs">#vehicles</code>,{' '}
        <code className="text-xs">/vehicles</code>) o URL externa. En el pie de sección puedes usar{' '}
        <code className="text-xs">{'{{count}}'}</code> para insertar el número de vehículos cargados en la página.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
            />
            <span className="font-medium">Mostrar esta sección debajo del inventario</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.showFooterPulse}
              onChange={(e) => setForm((f) => ({ ...f, showFooterPulse: e.target.checked }))}
            />
            <span className="font-medium">Mostrar punto verde animado junto al pie de sección</span>
          </label>

          <div>
            <label className="block text-sm font-medium mb-1">Título</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Descripción</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="font-semibold">Botón principal (oscuro)</h2>
          <div>
            <label className="block text-sm font-medium mb-1">Etiqueta pequeña (arriba)</label>
            <input
              type="text"
              value={form.primarySmallLabel}
              onChange={(e) => setForm((f) => ({ ...f, primarySmallLabel: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Ej. Inventario certificado"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Texto principal</label>
            <input
              type="text"
              value={form.primaryMainLabel}
              onChange={(e) => setForm((f) => ({ ...f, primaryMainLabel: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Ej. Ver todo el catálogo"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Texto al pasar el mouse (opcional)</label>
            <input
              type="text"
              value={form.primaryHoverHint}
              onChange={(e) => setForm((f) => ({ ...f, primaryHoverHint: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Enlace del botón principal *</label>
            <input
              type="text"
              value={form.primaryHref}
              onChange={(e) => setForm((f) => ({ ...f, primaryHref: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
              placeholder="#vehicles o /ruta o https://..."
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="font-semibold">Botón secundario (blanco)</h2>
          <div>
            <label className="block text-sm font-medium mb-1">Texto</label>
            <input
              type="text"
              value={form.secondaryLabel}
              onChange={(e) => setForm((f) => ({ ...f, secondaryLabel: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Ej. Contacto"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Enlace (vacío = no clicable)</label>
            <input
              type="text"
              value={form.secondaryHref}
              onChange={(e) => setForm((f) => ({ ...f, secondaryHref: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
              placeholder="/contacto"
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="font-semibold">Pie de sección</h2>
          <div>
            <label className="block text-sm font-medium mb-1">Texto (usa {'{{count}}'} para total en catálogo)</label>
            <input
              type="text"
              value={form.footerText}
              onChange={(e) => setForm((f) => ({ ...f, footerText: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Ej. Catálogo actualizado • {{count}} vehículos listados"
            />
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          <button type="button" onClick={() => router.back()} className="px-6 py-2 border rounded-lg">
            Volver
          </button>
        </div>
      </form>
    </div>
  );
}
