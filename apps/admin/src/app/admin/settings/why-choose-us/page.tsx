'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const ICON_KEYS = ['search', 'chat', 'chart', 'support', 'shield', 'star', 'truck', 'phone'] as const;
const COLOR_KEYS = ['blue', 'green', 'purple', 'amber', 'rose', 'slate', 'indigo', 'teal'] as const;

type IconKey = (typeof ICON_KEYS)[number];
type ColorKey = (typeof COLOR_KEYS)[number];

interface Card {
  title: string;
  description: string;
  footerLabel: string;
  iconKey: IconKey;
  colorKey: ColorKey;
}

const emptyCard = (): Card => ({
  title: '',
  description: '',
  footerLabel: '',
  iconKey: 'search',
  colorKey: 'blue',
});

export default function WhyChooseUsSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    enabled: false,
    badgeLabel: '',
    titleStart: '',
    titleHighlight: '',
    titleEnd: '',
    subtitle: '',
    cards: [] as Card[],
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/settings/why-choose-us');
        if (res.ok) {
          const data = await res.json();
          setForm({
            enabled: data.enabled === true,
            badgeLabel: data.badgeLabel ?? '',
            titleStart: data.titleStart ?? '',
            titleHighlight: data.titleHighlight ?? '',
            titleEnd: data.titleEnd ?? '',
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

  function updateCard(i: number, patch: Partial<Card>) {
    setForm((f) => {
      const cards = [...f.cards];
      cards[i] = { ...cards[i], ...patch };
      return { ...f, cards };
    });
  }

  function addCard() {
    setForm((f) => ({ ...f, cards: [...f.cards, emptyCard()].slice(0, 8) }));
  }

  function removeCard(i: number) {
    setForm((f) => ({ ...f, cards: f.cards.filter((_, j) => j !== i) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings/why-choose-us', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.config) setForm(data.config);
        alert('Guardado. La home solo muestra la sección si está activa y hay al menos una tarjeta válida.');
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
      <h1 className="text-2xl font-bold mb-2">¿Por qué elegirnos? (home pública)</h1>
      <p className="text-sm text-gray-600 mb-8">
        Por defecto la sección está <strong>desactivada</strong>. El título puede partirse en tres fragmentos; el del
        medio se muestra en <strong className="text-blue-600">azul</strong> (ej.: “¿Por Qué ” + “Elegirnos” + “?”).
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
            <label className="block text-sm font-medium mb-1">Badge superior</label>
            <input
              type="text"
              value={form.badgeLabel}
              onChange={(e) => setForm((f) => ({ ...f, badgeLabel: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Ej. Garantía total"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Título (inicio)</label>
              <input
                type="text"
                value={form.titleStart}
                onChange={(e) => setForm((f) => ({ ...f, titleStart: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="¿Por Qué "
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Título (resaltado)</label>
              <input
                type="text"
                value={form.titleHighlight}
                onChange={(e) => setForm((f) => ({ ...f, titleHighlight: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Elegirnos"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Título (final)</label>
              <input
                type="text"
                value={form.titleEnd}
                onChange={(e) => setForm((f) => ({ ...f, titleEnd: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="?"
              />
            </div>
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
              Sin tarjetas la sección no se mostrará.
            </p>
          ) : null}

          {form.cards.map((card, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow border space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Tarjeta {index + 1}</span>
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
                  <label className="block text-xs font-medium text-gray-600 mb-1">Icono</label>
                  <select
                    value={card.iconKey}
                    onChange={(e) => updateCard(index, { iconKey: e.target.value as IconKey })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {ICON_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
                  <select
                    value={card.colorKey}
                    onChange={(e) => updateCard(index, { colorKey: e.target.value as ColorKey })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {COLOR_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
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
                <label className="block text-xs font-medium text-gray-600 mb-1">Pie (junto al ✓)</label>
                <input
                  type="text"
                  value={card.footerLabel}
                  onChange={(e) => updateCard(index, { footerLabel: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
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
