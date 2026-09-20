'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

type Item = { slug: string; label: string; sortOrder: number };
type Category = {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  moduleKey?: string;
  isActive?: boolean;
  specialties?: Item[];
  vehicleScopes?: Item[];
};

export default function AdminBusinessCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [newSpecialty, setNewSpecialty] = useState('');
  const [newScope, setNewScope] = useState('');
  const [saving, setSaving] = useState(false);

  async function load(seed = false) {
    const url = seed
      ? '/api/admin/business-categories/specializations?seed=1'
      : '/api/admin/business-categories';
    const res = await fetchWithAuth(url);
    const data = await res.json();
    const list: Category[] = data.categories || [];
    setCategories(list);
    setSelectedId((current) => current || list[0]?.id || '');
  }

  useEffect(() => {
    void load(true);
  }, []);

  const selected = useMemo(
    () => categories.find((c) => c.id === selectedId) || categories[0],
    [categories, selectedId]
  );

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    await fetchWithAuth('/api/admin/business-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug }),
    });
    setName('');
    setSlug('');
    void load();
  }

  async function toggle(cat: Category) {
    await fetchWithAuth('/api/admin/business-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...cat, isActive: !cat.isActive }),
    });
    void load();
  }

  async function saveItem(kind: 'specialties' | 'vehicleScopes', label: string, existingSlug?: string) {
    if (!selected || !label.trim()) return;
    setSaving(true);
    await fetchWithAuth('/api/admin/business-categories/specializations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoryId: selected.id,
        kind,
        label: label.trim(),
        slug: existingSlug,
      }),
    });
    setSaving(false);
    if (kind === 'specialties') setNewSpecialty('');
    else setNewScope('');
    void load();
  }

  async function removeItem(kind: 'specialties' | 'vehicleScopes', itemSlug: string) {
    if (!selected || !confirm('¿Eliminar este ítem?')) return;
    await fetchWithAuth('/api/admin/business-categories/specializations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', categoryId: selected.id, kind, slug: itemSlug }),
    });
    void load();
  }

  async function move(kind: 'specialties' | 'vehicleScopes', itemSlug: string, dir: -1 | 1) {
    if (!selected) return;
    const list = [...((kind === 'specialties' ? selected.specialties : selected.vehicleScopes) || [])];
    const index = list.findIndex((i) => i.slug === itemSlug);
    const next = index + dir;
    if (index < 0 || next < 0 || next >= list.length) return;
    const copy = [...list];
    const [row] = copy.splice(index, 1);
    copy.splice(next, 0, row);
    await fetchWithAuth('/api/admin/business-categories/specializations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reorder',
        categoryId: selected.id,
        kind,
        slugs: copy.map((i) => i.slug),
      }),
    });
    void load();
  }

  function ListEditor({
    title,
    kind,
    items,
    draft,
    setDraft,
  }: {
    title: string;
    kind: 'specialties' | 'vehicleScopes';
    items: Item[];
    draft: string;
    setDraft: (v: string) => void;
  }) {
    return (
      <section className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">{title}</h3>
          <span className="text-sm text-gray-500">{items.length} ítems</span>
        </div>
        <form
          className="flex gap-2 mb-3"
          onSubmit={(e) => {
            e.preventDefault();
            void saveItem(kind, draft);
          }}
        >
          <input
            className="flex-1 border rounded px-3 py-2"
            placeholder="Agregar ítem en español"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button disabled={saving} className="px-3 py-2 bg-primary-600 text-white rounded">
            Agregar
          </button>
        </form>
        <ul className="divide-y">
          {items.map((item) => (
            <li key={item.slug} className="py-2 flex items-center gap-2">
              <div className="flex-1">
                <div className="font-medium">{item.label}</div>
                <div className="text-xs text-gray-500">{item.slug}</div>
              </div>
              <button className="text-xs text-gray-500" onClick={() => void move(kind, item.slug, -1)}>
                Subir
              </button>
              <button className="text-xs text-gray-500" onClick={() => void move(kind, item.slug, 1)}>
                Bajar
              </button>
              <button
                className="text-xs text-primary-700"
                onClick={() => {
                  const next = window.prompt('Renombrar', item.label);
                  if (next) void saveItem(kind, next, item.slug);
                }}
              >
                Renombrar
              </button>
              <button className="text-xs text-red-600" onClick={() => void removeItem(kind, item.slug)}>
                Borrar
              </button>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-2">Categorías de servicios</h1>
      <p className="text-gray-600 mb-6">
        Listas vivas: qué hacen y en qué vehículos. Los cambios se guardan al instante; el portal de
        negocio y www las leen sin redesplegar.
      </p>
      <form onSubmit={handleCreate} className="flex gap-3 mb-6">
        <input className="border rounded px-3 py-2" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="border rounded px-3 py-2" placeholder="slug (opcional)" value={slug} onChange={(e) => setSlug(e.target.value)} />
        <button className="px-4 py-2 bg-primary-600 text-white rounded">Agregar categoría</button>
      </form>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        <div className="bg-white rounded-xl overflow-hidden h-fit">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedId(cat.id)}
              className={`w-full text-left border-t px-4 py-3 ${selected?.id === cat.id ? 'bg-primary-50' : ''}`}
            >
              <div className="font-medium">
                {cat.icon} {cat.name}
              </div>
              <div className="text-xs text-gray-500">
                {(cat.specialties || []).length} trabajos · {(cat.vehicleScopes || []).length} vehículos
              </div>
              <button className="text-xs text-primary-700 mt-1" onClick={() => toggle(cat)}>
                {cat.isActive ? 'Desactivar' : 'Activar'}
              </button>
            </button>
          ))}
        </div>

        {selected ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold">
                {selected.icon} {selected.name}
              </h2>
              <p className="text-sm text-gray-500">/{selected.slug}</p>
            </div>
            <ListEditor
              title="Qué hacen"
              kind="specialties"
              items={selected.specialties || []}
              draft={newSpecialty}
              setDraft={setNewSpecialty}
            />
            <ListEditor
              title="En qué vehículos trabajan"
              kind="vehicleScopes"
              items={selected.vehicleScopes || []}
              draft={newScope}
              setDraft={setNewScope}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
