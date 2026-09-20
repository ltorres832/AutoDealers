'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

type ImportField =
  | 'vin' | 'stockNumber' | 'make' | 'model' | 'year' | 'price' | 'mileage'
  | 'color' | 'condition' | 'status' | 'quantity' | 'transmission' | 'fuelType'
  | 'engine' | 'doors' | 'seats' | 'bodyType' | 'description' | 'photos' | 'dealer';

const FIELD_LABELS: Record<ImportField, string> = {
  vin: 'VIN',
  stockNumber: 'Número de stock',
  make: 'Marca',
  model: 'Modelo',
  year: 'Año',
  price: 'Precio',
  mileage: 'Millas',
  color: 'Color',
  condition: 'Condición',
  status: 'Estado',
  quantity: 'Cantidad disponible',
  transmission: 'Transmisión',
  fuelType: 'Combustible',
  engine: 'Motor',
  doors: 'Puertas',
  seats: 'Asientos',
  bodyType: 'Tipo de carrocería',
  description: 'Descripción',
  photos: 'Fotos (URLs)',
  dealer: 'Dealer/Sede',
};

type PreviewRow = {
  rowIndex: number;
  action: 'create' | 'update' | 'error';
  matchedBy: 'vin' | 'stockNumber' | null;
  error: string | null;
  vinDecoded: Record<string, unknown> | null;
  data: Record<string, unknown>;
};

type PreviewResponse = {
  headers: string[];
  mapping: Record<string, ImportField | null>;
  totalRows: number;
  plan: { toCreate: number; toUpdate: number; errors: number; rows: PreviewRow[] };
  remainingSlots: number | null;
  exceedsLimit: boolean;
  error?: string;
};

type CommitResult = {
  created: number;
  updated: number;
  skipped: number;
  photosUploaded: number;
  errors: { rowIndex: number; error: string }[];
};

export default function BulkImportPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [file, setFile] = useState<File | null>(null);
  const [matchKey, setMatchKey] = useState<'auto' | 'vin' | 'stockNumber'>('auto');
  const [importPhotos, setImportPhotos] = useState(true);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [mapping, setMapping] = useState<Record<string, ImportField | null>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const runPreview = async (customMapping?: Record<string, ImportField | null>) => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('matchKey', matchKey);
      if (customMapping) formData.append('mapping', JSON.stringify(customMapping));
      const res = await fetchWithAuth('/api/vehicles/bulk-import/preview', {
        method: 'POST',
        body: formData,
      });
      const data: PreviewResponse = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error procesando el archivo');
      setPreview(data);
      setMapping(data.mapping);
      setStep(customMapping ? 3 : 2);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error procesando el archivo');
    } finally {
      setLoading(false);
    }
  };

  const runCommit = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('matchKey', matchKey);
      formData.append('mapping', JSON.stringify(mapping));
      formData.append('importPhotos', importPhotos ? 'true' : 'false');
      const res = await fetchWithAuth('/api/vehicles/bulk-import/commit', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error importando el inventario');
      setCommitResult(data.result as CommitResult);
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error importando el inventario');
    } finally {
      setLoading(false);
    }
  };

  const unmappedHeaders = useMemo(
    () => (preview ? preview.headers.filter((h) => !mapping[h]) : []),
    [preview, mapping]
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Importación masiva de inventario</h1>
          <p className="text-gray-500 mt-1">
            Sube tu inventario en CSV o Excel. Identificamos cada vehículo por VIN o número de stock.
          </p>
        </div>
        <Link
          href="/inventory"
          className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          ← Volver al inventario
        </Link>
      </div>

      {/* Pasos */}
      <div className="flex items-center gap-2 mb-8 text-sm">
        {['Archivo', 'Mapeo', 'Vista previa', 'Resultado'].map((label, idx) => {
          const n = (idx + 1) as 1 | 2 | 3 | 4;
          return (
            <div key={label} className="flex items-center gap-2">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center font-semibold ${
                  step >= n ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {n}
              </span>
              <span className={step >= n ? 'text-gray-900 font-medium' : 'text-gray-400'}>{label}</span>
              {n < 4 && <span className="text-gray-300 mx-1">—</span>}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>
      )}

      {/* Paso 1: archivo */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) setFile(f);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-4xl mb-3">📄</p>
            {file ? (
              <p className="font-medium text-gray-900">{file.name}</p>
            ) : (
              <>
                <p className="font-medium text-gray-900">Arrastra tu archivo aquí o haz clic para elegirlo</p>
                <p className="text-sm text-gray-500 mt-1">CSV, XLSX o XLS — máx. 50 MB</p>
              </>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              Identificar vehículos por
              <select
                value={matchKey}
                onChange={(e) => setMatchKey(e.target.value as 'auto' | 'vin' | 'stockNumber')}
                className="border border-gray-300 rounded-lg px-3 py-1.5"
              >
                <option value="auto">Automático (VIN, luego stock)</option>
                <option value="vin">Solo VIN</option>
                <option value="stockNumber">Solo número de stock</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={importPhotos}
                onChange={(e) => setImportPhotos(e.target.checked)}
              />
              Importar fotos desde URLs del archivo
            </label>
            <a
              href="/api/vehicles/bulk-import/template"
              className="text-sm text-primary-600 hover:underline"
              download
            >
              Descargar plantilla CSV
            </a>
          </div>

          <div className="mt-8">
            <button
              disabled={!file || loading}
              onClick={() => void runPreview()}
              className="bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Analizando…' : 'Analizar archivo'}
            </button>
          </div>
        </div>
      )}

      {/* Paso 2: mapeo */}
      {step === 2 && preview && (
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <h2 className="text-lg font-semibold mb-1">Mapeo de columnas</h2>
          <p className="text-sm text-gray-500 mb-6">
            Detectamos automáticamente las columnas. Corrige las que no se reconocieron.
            {unmappedHeaders.length > 0 && (
              <span className="text-amber-600"> {unmappedHeaders.length} columna(s) sin mapear se ignorarán.</span>
            )}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {preview.headers.map((header) => (
              <div key={header} className="flex items-center justify-between gap-3 border border-gray-100 rounded-lg px-4 py-2.5">
                <span className="font-mono text-sm text-gray-800 truncate" title={header}>{header}</span>
                <select
                  value={mapping[header] ?? ''}
                  onChange={(e) =>
                    setMapping((m) => ({
                      ...m,
                      [header]: (e.target.value || null) as ImportField | null,
                    }))
                  }
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm min-w-[180px]"
                >
                  <option value="">— Ignorar —</option>
                  {(Object.keys(FIELD_LABELS) as ImportField[]).map((f) => (
                    <option key={f} value={f}>{FIELD_LABELS[f]}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="mt-8 flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Atrás
            </button>
            <button
              disabled={loading}
              onClick={() => void runPreview(mapping)}
              className="bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Generando vista previa…' : 'Continuar a vista previa'}
            </button>
          </div>
        </div>
      )}

      {/* Paso 3: vista previa */}
      {step === 3 && preview && (
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="rounded-lg bg-green-50 border border-green-200 px-5 py-3">
              <p className="text-2xl font-bold text-green-700">{preview.plan.toCreate}</p>
              <p className="text-sm text-green-800">a crear</p>
            </div>
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-5 py-3">
              <p className="text-2xl font-bold text-blue-700">{preview.plan.toUpdate}</p>
              <p className="text-sm text-blue-800">a actualizar</p>
            </div>
            <div className="rounded-lg bg-red-50 border border-red-200 px-5 py-3">
              <p className="text-2xl font-bold text-red-700">{preview.plan.errors}</p>
              <p className="text-sm text-red-800">con errores (se omiten)</p>
            </div>
            {preview.remainingSlots != null && (
              <div className={`rounded-lg px-5 py-3 border ${preview.exceedsLimit ? 'bg-amber-50 border-amber-300' : 'bg-gray-50 border-gray-200'}`}>
                <p className="text-2xl font-bold text-gray-700">{preview.remainingSlots}</p>
                <p className="text-sm text-gray-600">cupo restante del plan</p>
                {preview.exceedsLimit && (
                  <p className="text-xs text-amber-700 mt-1">Se crearán solo hasta el límite del plan</p>
                )}
              </div>
            )}
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-[480px] overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">#</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Acción</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">VIN / Stock</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Vehículo</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Precio</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Cant.</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.plan.rows.map((r) => {
                  const d = r.data as Record<string, any>;
                  const decoded = r.vinDecoded as Record<string, any> | null;
                  const label = [d.year ?? decoded?.year, d.make ?? decoded?.make, d.model ?? decoded?.model]
                    .filter(Boolean)
                    .join(' ');
                  return (
                    <tr key={r.rowIndex} className={r.action === 'error' ? 'bg-red-50/50' : ''}>
                      <td className="px-3 py-2 text-gray-500">{r.rowIndex}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            r.action === 'create'
                              ? 'bg-green-100 text-green-800'
                              : r.action === 'update'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {r.action === 'create' ? 'Crear' : r.action === 'update' ? 'Actualizar' : 'Error'}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{String(d.vin || d.stockNumber || '—')}</td>
                      <td className="px-3 py-2">
                        {label || '—'}
                        {decoded && (
                          <span className="ml-1 text-xs text-purple-600" title="Datos completados por VIN">✨VIN</span>
                        )}
                      </td>
                      <td className="px-3 py-2">{d.price != null ? `$${Number(d.price).toLocaleString()}` : '—'}</td>
                      <td className="px-3 py-2">{d.quantity ?? '—'}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">
                        {r.error || (r.matchedBy ? `Match por ${r.matchedBy === 'vin' ? 'VIN' : 'stock'}` : '')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-8 flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Atrás
            </button>
            <button
              disabled={loading || preview.plan.toCreate + preview.plan.toUpdate === 0}
              onClick={() => void runCommit()}
              className="bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {loading
                ? 'Importando…'
                : `Importar ${preview.plan.toCreate + preview.plan.toUpdate} vehículos`}
            </button>
          </div>
        </div>
      )}

      {/* Paso 4: resultado */}
      {step === 4 && commitResult && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-5xl mb-4">✅</p>
          <h2 className="text-2xl font-bold mb-2">Importación completada</h2>
          <p className="text-gray-600 mb-6">
            {commitResult.created} creados · {commitResult.updated} actualizados · {commitResult.skipped} omitidos
            {commitResult.photosUploaded > 0 && ` · ${commitResult.photosUploaded} fotos importadas`}
          </p>
          {commitResult.errors.length > 0 && (
            <div className="text-left max-w-xl mx-auto mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="font-medium text-amber-800 mb-2">Filas con avisos:</p>
              <ul className="text-sm text-amber-700 space-y-1">
                {commitResult.errors.slice(0, 20).map((e, i) => (
                  <li key={i}>Fila {e.rowIndex}: {e.error}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex justify-center gap-3">
            <Link
              href="/inventory"
              className="bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700"
            >
              Ver inventario
            </Link>
            <button
              onClick={() => {
                setStep(1);
                setFile(null);
                setPreview(null);
                setCommitResult(null);
              }}
              className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Importar otro archivo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
