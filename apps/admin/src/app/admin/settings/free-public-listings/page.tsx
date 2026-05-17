'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FreePublicListingsSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    enabled: true,
    maxActiveFreeVehiclesPerSeller: 2,
    durationDays: 14,
    ctaTitle: '¿Quieres vender?',
    ctaSubtitle: 'Publica tu auto hoy mismo y llega a millones',
    ctaButtonLabel: 'Publicar Gratis',
    quickListingPath: '/publicar-gratis',
    registerPath: '/register?type=seller',
    registerCtaLabel: 'Crear cuenta de vendedor (más beneficios)',
    successHeadline: '¡Tu anuncio está publicado!',
    successSubtitle:
      'Regístrate gratis como vendedor y consigue muchos más clientes: panel de control, cotizaciones, financiamiento, mensajería y mucho más.',
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/settings/free-public-listings');
        if (res.ok) {
          const data = await res.json();
          setForm({
            enabled: data.enabled !== false,
            maxActiveFreeVehiclesPerSeller: data.maxActiveFreeVehiclesPerSeller ?? 2,
            durationDays: data.durationDays ?? 14,
            ctaTitle: data.ctaTitle ?? '',
            ctaSubtitle: data.ctaSubtitle ?? '',
            ctaButtonLabel: data.ctaButtonLabel ?? '',
            quickListingPath: data.quickListingPath ?? '/publicar-gratis',
            registerPath: data.registerPath ?? '/register?type=seller',
            registerCtaLabel:
              data.registerCtaLabel ?? 'Crear cuenta de vendedor (más beneficios)',
            successHeadline: data.successHeadline ?? '¡Tu anuncio está publicado!',
            successSubtitle:
              data.successSubtitle ??
              'Regístrate gratis como vendedor y consigue muchos más clientes: panel de control, cotizaciones, financiamiento, mensajería y mucho más.',
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
      const res = await fetch('/api/admin/settings/free-public-listings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        alert('Configuración guardada');
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
      <h1 className="text-2xl font-bold mb-2">Publicar gratis (landing pública)</h1>
      <p className="text-sm text-gray-600 mb-8">
        Aplica a vendedores <strong>sin plan de pago</strong> (tenant sin membresía). Puedes limitar cuántos autos
        activos puede tener cada usuario y cuántos días dura cada anuncio gratuito. Los anuncios vencidos dejan de
        mostrarse en el catálogo público y liberan cupo.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
            />
            <span className="font-medium">Permitir publicaciones gratuitas</span>
          </label>

          <div>
            <label className="block text-sm font-medium mb-1">Máx. anuncios gratis activos por vendedor</label>
            <input
              type="number"
              min={0}
              max={100}
              value={form.maxActiveFreeVehiclesPerSeller}
              onChange={(e) =>
                setForm((f) => ({ ...f, maxActiveFreeVehiclesPerSeller: parseInt(e.target.value, 10) || 0 }))
              }
              className="w-full max-w-xs px-3 py-2 border rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">
              Cuentan los que no están vendidos y no han vencido. Con 0, nadie puede publicar gratis (deben tener
              plan).
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Duración de cada anuncio (días)</label>
            <input
              type="number"
              min={1}
              max={365}
              value={form.durationDays}
              onChange={(e) => setForm((f) => ({ ...f, durationDays: parseInt(e.target.value, 10) || 1 }))}
              className="w-full max-w-xs px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="font-semibold">Texto del bloque en la home</h2>
          <div>
            <label className="block text-sm font-medium mb-1">Título</label>
            <input
              type="text"
              value={form.ctaTitle}
              onChange={(e) => setForm((f) => ({ ...f, ctaTitle: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Subtítulo</label>
            <textarea
              value={form.ctaSubtitle}
              onChange={(e) => setForm((f) => ({ ...f, ctaSubtitle: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Texto del botón</label>
            <input
              type="text"
              value={form.ctaButtonLabel}
              onChange={(e) => setForm((f) => ({ ...f, ctaButtonLabel: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Ruta del formulario gratis (botón principal)
              </label>
              <input
                type="text"
                value={form.quickListingPath}
                onChange={(e) =>
                  setForm((f) => ({ ...f, quickListingPath: e.target.value }))
                }
                className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                placeholder="/publicar-gratis"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Página que abre cuando el visitante toca el botón &quot;Publicar Gratis&quot;.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Ruta de registro completo (CTA secundario)
              </label>
              <input
                type="text"
                value={form.registerPath}
                onChange={(e) => setForm((f) => ({ ...f, registerPath: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                placeholder="/register?type=seller"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Texto del CTA secundario (registro)
            </label>
            <input
              type="text"
              value={form.registerCtaLabel}
              onChange={(e) =>
                setForm((f) => ({ ...f, registerCtaLabel: e.target.value }))
              }
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="font-semibold">Pantalla de éxito (después de publicar)</h2>
          <p className="text-xs text-gray-500">
            Mensajes que invitan al vendedor a registrarse y obtener todos los beneficios.
          </p>
          <div>
            <label className="block text-sm font-medium mb-1">Título</label>
            <input
              type="text"
              value={form.successHeadline}
              onChange={(e) =>
                setForm((f) => ({ ...f, successHeadline: e.target.value }))
              }
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Subtítulo</label>
            <textarea
              value={form.successSubtitle}
              onChange={(e) =>
                setForm((f) => ({ ...f, successSubtitle: e.target.value }))
              }
              rows={3}
              className="w-full px-3 py-2 border rounded-lg"
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
