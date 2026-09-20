'use client';

export type SpecializationOption = { slug: string; label: string };

export function SpecializationFilter({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: SpecializationOption[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const selected = new Set(value);
  if (!options.length) return null;
  return (
    <details className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <summary className="cursor-pointer font-semibold text-slate-800">
        {label}
        {value.length ? ` (${value.length})` : ''}
      </summary>
      <div className="mt-3 max-h-56 overflow-auto space-y-1.5">
        {options.map((opt) => (
          <label key={opt.slug} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.has(opt.slug)}
              onChange={() => {
                if (selected.has(opt.slug)) onChange(value.filter((item) => item !== opt.slug));
                else onChange([...value, opt.slug]);
              }}
            />
            {opt.label}
          </label>
        ))}
      </div>
    </details>
  );
}
