'use client';

import { useMemo, useState } from 'react';

export type SpecializationOption = { slug: string; label: string };

export function SpecializationMultiSelect({
  label,
  hint,
  options,
  value,
  onChange,
  required,
}: {
  label: string;
  hint?: string;
  options: SpecializationOption[];
  value: string[];
  onChange: (next: string[]) => void;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const selected = useMemo(() => new Set(value), [value]);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((opt) => opt.label.toLowerCase().includes(needle) || opt.slug.includes(needle));
  }, [options, q]);

  function toggle(slug: string) {
    if (selected.has(slug)) onChange(value.filter((item) => item !== slug));
    else onChange([...value, slug]);
  }

  return (
    <div className="relative">
      <p className="text-sm font-semibold text-slate-800 mb-1">
        {label}
        {required ? ' *' : ''}
      </p>
      {hint ? <p className="text-xs text-slate-500 mb-2">{hint}</p> : null}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left border rounded-xl px-4 py-3 bg-white"
      >
        {value.length ? `${value.length} seleccionados` : 'Selecciona una o más opciones'}
      </button>
      {open ? (
        <div className="absolute z-20 mt-2 w-full max-h-72 overflow-auto rounded-xl border bg-white shadow-lg p-3">
          <input
            className="w-full border rounded-lg px-3 py-2 mb-2"
            placeholder="Buscar…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-500">No hay ítems en esta lista.</p>
          ) : (
            filtered.map((opt) => (
              <label key={opt.slug} className="flex items-center gap-2 py-1.5 text-sm">
                <input type="checkbox" checked={selected.has(opt.slug)} onChange={() => toggle(opt.slug)} />
                {opt.label}
              </label>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
