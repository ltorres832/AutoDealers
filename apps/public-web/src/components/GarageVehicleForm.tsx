'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

export type GarageVehicleFormValues = {
  year: string;
  make: string;
  model: string;
  trim: string;
  mileage: string;
  vin: string;
  plate: string;
  color: string;
  notes: string;
  email: string;
  phone: string;
  insuranceDueAt: string;
  inspectionDueAt: string;
  marbeteDueAt: string;
  lastTireRotationAt: string;
};

const EMPTY_FORM: GarageVehicleFormValues = {
  year: '',
  make: '',
  model: '',
  trim: '',
  mileage: '',
  vin: '',
  plate: '',
  color: '',
  notes: '',
  email: '',
  phone: '',
  insuranceDueAt: '',
  inspectionDueAt: '',
  marbeteDueAt: '',
  lastTireRotationAt: '',
};

type Catalog = {
  years: number[];
  makes: string[];
  modelsByMake: Record<string, string[]>;
  trimsByMakeModel: Record<string, string[]>;
};

export function GarageVehicleForm({
  authenticated,
  askContact,
  submitting,
  error,
  onSubmit,
}: {
  authenticated: boolean;
  askContact: boolean;
  submitting: boolean;
  error?: string;
  onSubmit: (values: GarageVehicleFormValues) => void;
}) {
  const [form, setForm] = useState<GarageVehicleFormValues>(EMPTY_FORM);
  const [catalog, setCatalog] = useState<Catalog>({
    years: [],
    makes: [],
    modelsByMake: {},
    trimsByMakeModel: {},
  });

  useEffect(() => {
    fetch('/api/public/vehicle-catalog')
      .then((res) => res.json())
      .then((data) => {
        setCatalog({
          years: Array.isArray(data.years) ? data.years : [],
          makes: Array.isArray(data.makes) ? data.makes : [],
          modelsByMake: data.modelsByMake || {},
          trimsByMakeModel: data.trimsByMakeModel || {},
        });
      })
      .catch(() => undefined);
  }, []);

  const models = useMemo(() => {
    if (!form.make) return [];
    return catalog.modelsByMake[form.make] || [];
  }, [catalog.modelsByMake, form.make]);

  const trims = useMemo(() => {
    if (!form.make || !form.model) return [];
    return catalog.trimsByMakeModel[`${form.make}||${form.model}`] || [];
  }, [catalog.trimsByMakeModel, form.make, form.model]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  const inputClass = 'w-full rounded-xl border border-slate-200 px-4 py-3 bg-white';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Datos para reconocerlo</h2>
        <p className="text-sm text-slate-600 mb-4">
          Año, marca y modelo son obligatorios. Usamos el mismo catálogo de los anuncios cuando
          existe; si tu carro no aparece, escríbelo.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Año *</span>
            <input
              required
              list="garage-years"
              inputMode="numeric"
              className={inputClass}
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
              placeholder="2018"
            />
            <datalist id="garage-years">
              {catalog.years.map((year) => (
                <option key={year} value={year} />
              ))}
            </datalist>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Marca *</span>
            <input
              required
              list="garage-makes"
              className={inputClass}
              value={form.make}
              onChange={(e) => setForm({ ...form, make: e.target.value, model: '', trim: '' })}
              placeholder="Toyota"
            />
            <datalist id="garage-makes">
              {catalog.makes.map((make) => (
                <option key={make} value={make} />
              ))}
            </datalist>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Modelo *</span>
            <input
              required
              list="garage-models"
              className={inputClass}
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value, trim: '' })}
              placeholder="Corolla"
            />
            <datalist id="garage-models">
              {models.map((model) => (
                <option key={model} value={model} />
              ))}
            </datalist>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Versión / trim</span>
            <input
              list="garage-trims"
              className={inputClass}
              value={form.trim}
              onChange={(e) => setForm({ ...form, trim: e.target.value })}
              placeholder="LE, EX, Sport…"
            />
            <datalist id="garage-trims">
              {trims.map((trim) => (
                <option key={trim} value={trim} />
              ))}
            </datalist>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Millaje</span>
            <input
              inputMode="numeric"
              className={inputClass}
              value={form.mileage}
              onChange={(e) => setForm({ ...form, mileage: e.target.value })}
              placeholder="65000"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Color</span>
            <input
              className={inputClass}
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              placeholder="Blanco"
            />
          </label>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Opcional</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">VIN</span>
            <input
              className={inputClass}
              value={form.vin}
              onChange={(e) => setForm({ ...form, vin: e.target.value })}
              placeholder="17 caracteres"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Tablilla</span>
            <input
              className={inputClass}
              value={form.plate}
              onChange={(e) => setForm({ ...form, plate: e.target.value })}
              placeholder="ABC-123"
            />
          </label>
          <label className="sm:col-span-2 block">
            <span className="text-sm font-semibold text-slate-700">Notas</span>
            <textarea
              className={inputClass}
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Ej. necesita alineación, usa aceite sintético…"
            />
          </label>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Fechas para recordatorios</h2>
        <p className="text-sm text-slate-600 mb-3">Si las dejas vacías, usamos plazos típicos.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Vence el seguro</span>
            <input
              type="date"
              className={inputClass}
              value={form.insuranceDueAt}
              onChange={(e) => setForm({ ...form, insuranceDueAt: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Inspección</span>
            <input
              type="date"
              className={inputClass}
              value={form.inspectionDueAt}
              onChange={(e) => setForm({ ...form, inspectionDueAt: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Marbete</span>
            <input
              type="date"
              className={inputClass}
              value={form.marbeteDueAt}
              onChange={(e) => setForm({ ...form, marbeteDueAt: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Última rotación de gomas</span>
            <input
              type="date"
              className={inputClass}
              value={form.lastTireRotationAt}
              onChange={(e) => setForm({ ...form, lastTireRotationAt: e.target.value })}
            />
          </label>
        </div>
      </div>

      {askContact && !authenticated ? (
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Para avisos (opcional)</h2>
          <p className="text-sm text-slate-600 mb-3">
            Sin cuenta también funciona. Email o teléfono sirven para recordatorios y para volver
            después.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="email"
              className={inputClass}
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <input
              className={inputClass}
              placeholder="Teléfono"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
        </div>
      ) : null}

      {error ? <p className="text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-primary-600 text-white font-bold py-3 hover:bg-primary-700 disabled:opacity-60"
      >
        {submitting ? 'Guardando…' : 'Guardar y ver sugerencias'}
      </button>
    </form>
  );
}
