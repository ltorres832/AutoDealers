'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
const GRADIENT_KEYS = [
  'blue',
  'emerald',
  'amber',
  'slate',
  'rose',
  'violet',
  'cyan',
] as const;

type GradientKey = (typeof GRADIENT_KEYS)[number];

interface ExclusiveOfferCard {
  title: string;
  description: string;
  badge: string;
  icon: string;
  gradientKey: GradientKey;
  buttonLabel: string;
  buttonHref: string;
}

interface ExclusiveOffersSectionConfig {
  enabled: boolean;
  badgeLabel: string;
  title: string;
  subtitle: string;
  cards: ExclusiveOfferCard[];
}

const emptyCard = (): ExclusiveOfferCard => ({
  title: '',
  description: '',
  badge: '',
  icon: '✨',
  gradientKey: 'slate',
  buttonLabel: 'Más información',
  buttonHref: '',
});

export default function ExclusiveOffersSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ExclusiveOffersSectionConfig>({
    enabled: false,
    badgeLabel: 'Promociones especiales',
    title: 'Ofertas exclusivas',
    subtitle: '',
    cards: [],
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/settings/exclusive-offers');
        if (res.ok) {
          const data = await res.json();
          setForm({
            enabled: data.enabled === true,
            badgeLabel: data.badgeLabel ?? '',
            title: data.title ?? '',
            subtitle: data.subtitle ?? '',
            cards: Array.isArray(data.cards) && data.cards.length ? data.cards : [],
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function updateCard(index: number, patch: Partial<ExclusiveOfferCard>) {
    setForm((f) => {
      const cards = [...f.cards];
      cards[index] = { ...cards[index], ...patch };
      return { ...f, cards };
    });
  }

  function addCard() {
    setForm((f) => ({ ...f, cards: [...f.cards, emptyCard()].slice(0, 8) }));
  }

  function removeCard(index: number) {
    setForm((f) => ({ ...f, cards: f.cards.filter((_, i) => i !== index) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings/exclusive-offers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.config) setForm(data.config);
        alert('Guardado. La home solo mostrará la sección si está activada y hay al menos una tarjeta válida.');
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
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Ofertas exclusivas (home pública)</h1>
      <p className="text-sm text-gray-600 mb-8">
        Esta sección <strong>no muestra datos por defecto</strong>. Actívala solo cuando tengas ofertas reales.
        Cada tarjeta puede enlazar a una página interna (p. ej. <code className="text-xs">/register</code>) o a una URL
        externa (<code className="text-xs">https://...</code>).
      </p>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
            />
            <span className="font-medium">Mostrar sección en la página principal</span>
          </label>

          <div>
            <label className="block text-sm font-medium mb-1">Etiqueta superior (badge)</label>
            <input
              type="text"
              value={form.badgeLabel}
              onChange={(e) => setForm((f) => ({ ...f, badgeLabel: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
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
            <label className="block text-sm font-medium mb-1">Subtítulo</label>
            <textarea
              value={form.subtitle}
              onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Tarjetas (máx. 8)</h2>
            <button
              type="button"
              onClick={addCard}
              disabled={form.cards.length >= 8}
              className="px-4 py-2 bg-slate-100 rounded-lg text-sm disabled:opacity-50"
            >
              + Añadir tarjeta
            </button>
          </div>

          {form.cards.length === 0 ? (
            <p className="text-sm text-gray-500 bg-amber-50 border border-amber-100 rounded-lg p-4">
              No hay tarjetas. La sección no se mostrará en la web aunque esté activada.
            </p>
          ) : null}

          {form.cards.map((card, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow border border-gray-100 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">Tarjeta {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeCard(index)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Eliminar
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Icono (emoji)</label>
                  <input
                    type="text"
                    value={card.icon}
                    onChange={(e) => updateCard(index, { icon: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    maxLength={8}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Etiqueta (badge)</label>
                  <input
                    type="text"
                    value={card.badge}
                    onChange={(e) => updateCard(index, { badge: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Título</label>
                <input
                  type="text"
                  value={card.title}
                  onChange={(e) => updateCard(index, { title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
                <textarea
                  value={card.description}
                  onChange={(e) => updateCard(index, { description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
                <select
                  value={card.gradientKey}
                  onChange={(e) =>
                    updateCard(index, { gradientKey: e.target.value as GradientKey })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {GRADIENT_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Texto del botón</label>
                  <input
                    type="text"
                    value={card.buttonLabel}
                    onChange={(e) => updateCard(index, { buttonLabel: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Enlace (vacío = sin enlace)
                  </label>
                  <input
                    type="text"
                    value={card.buttonHref}
                    onChange={(e) => updateCard(index, { buttonHref: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                    placeholder="/contacto o https://..."
                  />
                </div>
              </div>
            </div>
          ))}
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
