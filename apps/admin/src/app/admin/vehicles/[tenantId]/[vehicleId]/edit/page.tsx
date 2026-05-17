'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import BackButton from '@/components/BackButton';

export default function AdminEditVehiclePage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;
  const vehicleId = params.vehicleId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: '',
    vin: '',
    price: '',
    mileage: '',
    condition: 'used',
    color: '',
    transmission: 'automatic',
    fuelType: 'gasoline',
    description: '',
    status: 'available',
    features: [] as string[],
    photos: [] as string[],
    videos: [] as string[],
  });
  const [newFeature, setNewFeature] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/vehicles/${tenantId}/${vehicleId}`, {
          credentials: 'include',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(typeof data.error === 'string' ? data.error : 'No se pudo cargar el vehículo');
          return;
        }
        const v = data.vehicle;
        if (!v) {
          setError('Vehículo no encontrado');
          return;
        }
        setFormData({
          make: v.make || '',
          model: v.model || '',
          year: v.year != null ? String(v.year) : '',
          vin: v.vin || v.specifications?.vin || '',
          price: v.price != null ? String(v.price) : '',
          mileage: v.mileage != null ? String(v.mileage) : '',
          condition: v.condition || 'used',
          color: v.color || v.specifications?.color || '',
          transmission: v.transmission || v.specifications?.transmission || 'automatic',
          fuelType: v.fuelType || v.specifications?.fuelType || 'gasoline',
          description: v.description || '',
          status: v.status || 'available',
          features: Array.isArray(v.features) ? v.features : [],
          photos: Array.isArray(v.photos) ? v.photos : Array.isArray(v.images) ? v.images : [],
          videos: Array.isArray(v.videos) ? v.videos : [],
        });
      } catch (e) {
        setError('Error de red al cargar');
      } finally {
        setLoading(false);
      }
    }
    if (tenantId && vehicleId) load();
  }, [tenantId, vehicleId]);

  function addFeature() {
    if (newFeature.trim()) {
      setFormData((prev) => ({ ...prev, features: [...prev.features, newFeature.trim()] }));
      setNewFeature('');
    }
  }

  function removeFeature(i: number) {
    setFormData((prev) => ({ ...prev, features: prev.features.filter((_, idx) => idx !== i) }));
  }

  async function appendUploaded(files: FileList | null, field: 'photos' | 'videos') {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('type', 'vehicle');
        const uploadResponse = await fetch('/api/upload', { method: 'POST', body: fd });
        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          if (uploadData.url) urls.push(uploadData.url);
        }
      }
      setFormData((prev) => ({ ...prev, [field]: [...prev[field], ...urls] }));
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/vehicles/${tenantId}/${vehicleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          make: formData.make,
          model: formData.model,
          year: parseInt(formData.year, 10),
          vin: formData.vin || undefined,
          price: parseFloat(formData.price),
          mileage: formData.mileage ? parseInt(formData.mileage, 10) : undefined,
          condition: formData.condition,
          color: formData.color || undefined,
          transmission: formData.transmission,
          fuelType: formData.fuelType,
          description: formData.description,
          status: formData.status,
          features: formData.features,
          photos: formData.photos,
          videos: formData.videos.length ? formData.videos : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Error al guardar');
        return;
      }
      router.push(`/admin/all-vehicles?tenantId=${encodeURIComponent(tenantId)}`);
    } catch {
      setError('Error de red al guardar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <BackButton label="Volver" />
      <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-2">Editar vehículo</h1>
      <p className="text-sm text-gray-600 mb-6">
        Tenant:{' '}
        <Link href={`/admin/tenants/${tenantId}`} className="text-primary-600 hover:underline">
          {tenantId}
        </Link>{' '}
        · ID: <code className="text-xs bg-gray-100 px-1 rounded">{vehicleId}</code>
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Marca *</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={formData.make}
              onChange={(e) => setFormData({ ...formData, make: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Modelo *</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Año *</label>
            <input
              type="number"
              className="w-full border rounded px-3 py-2"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">VIN</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={formData.vin}
              onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Precio *</label>
            <input
              type="number"
              step="0.01"
              className="w-full border rounded px-3 py-2"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Millaje</label>
            <input
              type="number"
              className="w-full border rounded px-3 py-2"
              value={formData.mileage}
              onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Condición</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={formData.condition}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
            >
              <option value="new">Nuevo</option>
              <option value="used">Usado</option>
              <option value="certified">Certificado</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Estado inventario</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="available">Disponible</option>
              <option value="reserved">Reservado</option>
              <option value="sold">Vendido</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Color</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Transmisión</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={formData.transmission}
              onChange={(e) => setFormData({ ...formData, transmission: e.target.value })}
            >
              <option value="automatic">Automática</option>
              <option value="manual">Manual</option>
              <option value="cvt">CVT</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Combustible</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={formData.fuelType}
              onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
            >
              <option value="gasoline">Gasolina</option>
              <option value="diesel">Diésel</option>
              <option value="electric">Eléctrico</option>
              <option value="hybrid">Híbrido</option>
              <option value="plug-in-hybrid">Híbrido enchufable</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Descripción</label>
          <textarea
            className="w-full border rounded px-3 py-2 min-h-[100px]"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Características</label>
          <div className="flex gap-2 mb-2">
            <input
              className="flex-1 border rounded px-3 py-2"
              value={newFeature}
              onChange={(e) => setNewFeature(e.target.value)}
              placeholder="Ej: Aire acondicionado"
            />
            <button type="button" onClick={addFeature} className="px-3 py-2 border rounded bg-gray-50">
              Añadir
            </button>
          </div>
          <ul className="text-sm space-y-1">
            {formData.features.map((f, i) => (
              <li key={i} className="flex justify-between gap-2 bg-gray-50 px-2 py-1 rounded">
                <span>{f}</span>
                <button type="button" className="text-red-600" onClick={() => removeFeature(i)}>
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Fotos (URLs)</label>
          <input
            type="file"
            multiple
            accept="image/*"
            disabled={uploading}
            onChange={(e) => appendUploaded(e.target.files, 'photos')}
            className="mb-2 text-sm"
          />
          <p className="text-xs text-gray-500 mb-2">{uploading ? 'Subiendo…' : ' '}</p>
          <ul className="text-xs space-y-1 max-h-40 overflow-y-auto">
            {formData.photos.map((url, i) => (
              <li key={i} className="flex gap-2 items-start">
                <span className="truncate flex-1">{url}</span>
                <button
                  type="button"
                  className="text-red-600 shrink-0"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, photos: prev.photos.filter((_, idx) => idx !== i) }))
                  }
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Videos (URLs)</label>
          <input
            type="file"
            multiple
            accept="video/*"
            disabled={uploading}
            onChange={(e) => appendUploaded(e.target.files, 'videos')}
            className="mb-2 text-sm"
          />
          <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
            {formData.videos.map((url, i) => (
              <li key={i} className="flex gap-2 items-start">
                <span className="truncate flex-1">{url}</span>
                <button
                  type="button"
                  className="text-red-600 shrink-0"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, videos: prev.videos.filter((_, idx) => idx !== i) }))
                  }
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex gap-2 justify-end pt-4 border-t">
          <Link
            href={`/admin/all-vehicles?tenantId=${encodeURIComponent(tenantId)}`}
            className="px-4 py-2 border rounded"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving || uploading}
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}
