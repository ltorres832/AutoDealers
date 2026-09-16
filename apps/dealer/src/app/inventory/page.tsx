'use client';

import VehiclesList from '@/components/VehiclesList';
import { useState } from 'react';
import Link from 'next/link';
import { VEHICLE_TYPES, TRANSMISSION_OPTIONS, FUEL_TYPE_OPTIONS, DRIVE_TYPE_OPTIONS } from '@autodealers/inventory/client';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import UpgradeModal from '@/components/UpgradeModal';
import VinDecodeField from '@/components/VinDecodeField';

export default function InventoryPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h1 className="text-3xl font-bold">Inventario</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/catalog-interest"
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            👁️ Interés en la web
          </Link>
          <Link
            href="/inventory/network"
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            🏢 Multi-dealer
          </Link>
          <Link
            href="/inventory/bulk"
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            📥 Importación masiva
          </Link>
          <Link
            href="/inventory/site"
            className="px-4 py-2 border border-emerald-200 bg-emerald-50 rounded-lg text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
          >
            🌐 Mi sitio
          </Link>
          <Link
            href="/inventory/alliances"
            className="px-4 py-2 border border-amber-200 bg-amber-50 rounded-lg text-sm font-semibold text-amber-900 hover:bg-amber-100"
          >
            🤝 Alianzas
          </Link>
          <Link
            href="/inventory/feeds"
            className="px-4 py-2 border border-indigo-200 bg-indigo-50 rounded-lg text-sm font-semibold text-indigo-900 hover:bg-indigo-100"
          >
            🔄 Feeds
          </Link>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700"
          >
            Agregar Vehículo
          </button>
        </div>
      </div>

      <VehiclesList />

      {showCreateModal && (
        <CreateVehicleModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}

function CreateVehicleModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    bodyType: '' as string,
    year: new Date().getFullYear(),
    price: '',
    currency: 'USD',
    condition: 'used' as const,
    description: '',
    mileage: '',
    quantity: '',
    sellerCommissionType: 'percentage' as 'percentage' | 'fixed',
    sellerCommissionRate: '',
    sellerCommissionFixed: '',
    insuranceCommissionType: 'percentage' as 'percentage' | 'fixed',
    insuranceCommissionRate: '',
    insuranceCommissionFixed: '',
    accessoriesCommissionType: 'percentage' as 'percentage' | 'fixed',
    accessoriesCommissionRate: '',
    accessoriesCommissionFixed: '',
    // Features & Specs
    vin: '',
    stockNumber: '',
    transmission: '',
    fuelType: '',
    engine: '',
    exteriorColor: '',
    interiorColor: '',
    doors: '',
    seats: '',
    mpgCity: '',
    mpgHighway: '',
    driveType: '',
    hasAccidents: false,
    premiumFeatures: '',
  });
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const videoUploadsEnabled = useFeatureFlag('video_uploads');
  const vinCameraEnabled = useFeatureFlag('vin_camera_scan');
  const [showVideoUpgrade, setShowVideoUpgrade] = useState(false);
  const [showSpecs, setShowSpecs] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const vin = (formData.vin || '').trim();
    if (!vin || vin.length !== 17) {
      alert('El VIN es obligatorio');
      return;
    }
    setLoading(true);

    try {
      const photoUrls: string[] = [];
      const videoUrls: string[] = [];

      // Subir fotos
      for (const photo of photos) {
        const formDataPhoto = new FormData();
        formDataPhoto.append('file', photo);
        formDataPhoto.append('type', 'vehicle');

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formDataPhoto,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          photoUrls.push(uploadData.url);
        }
      }

      // Subir videos
      for (const video of videos) {
        const formDataVideo = new FormData();
        formDataVideo.append('file', video);
        formDataVideo.append('type', 'vehicle');

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formDataVideo,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          videoUrls.push(uploadData.url);
        }
      }

      const specifications: any = {};
      
      // Agregar campos de especificaciones si están llenos
      if (formData.vin) specifications.vin = formData.vin;
      if (formData.stockNumber) specifications.stockNumber = formData.stockNumber;
      if (formData.transmission) specifications.transmission = formData.transmission;
      if (formData.fuelType) specifications.fuelType = formData.fuelType;
      if (formData.engine) specifications.engine = formData.engine;
      if (formData.driveType) specifications.driveType = formData.driveType;
      if (formData.exteriorColor) {
        specifications.exteriorColor = formData.exteriorColor;
        specifications.color = formData.exteriorColor; // Compatibilidad con página pública
      }
      if (formData.interiorColor) specifications.interiorColor = formData.interiorColor;
      if (formData.doors) specifications.doors = parseInt(formData.doors);
      if (formData.seats) specifications.seats = parseInt(formData.seats);
      if (formData.mpgCity) specifications.mpgCity = parseInt(formData.mpgCity);
      if (formData.mpgHighway) specifications.mpgHighway = parseInt(formData.mpgHighway);
      if (formData.hasAccidents !== undefined) specifications.hasAccidents = formData.hasAccidents;
      if (formData.premiumFeatures) specifications.premiumFeatures = formData.premiumFeatures.split(',').map(f => f.trim()).filter(f => f);

      const response = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          make: formData.make,
          model: formData.model,
          bodyType: formData.bodyType || undefined,
          year: formData.year,
          price: parseFloat(formData.price),
          currency: formData.currency,
          condition: formData.condition,
          description: formData.description,
          mileage: formData.mileage ? parseInt(formData.mileage) : undefined,
          quantity:
            formData.quantity && parseInt(formData.quantity) > 0
              ? parseInt(formData.quantity)
              : undefined,
          quantitySold:
            formData.quantity && parseInt(formData.quantity) > 0 ? 0 : undefined,
          photos: photoUrls,
          videos: videoUrls,
          specifications: Object.keys(specifications).length > 0 ? specifications : {},
          vin: vin.toUpperCase(),
          stockNumber: formData.stockNumber || undefined,
          status: 'available',
          sellerCommissionType: formData.sellerCommissionType,
          sellerCommissionRate: formData.sellerCommissionType === 'percentage' && formData.sellerCommissionRate ? parseFloat(formData.sellerCommissionRate) : undefined,
          sellerCommissionFixed: formData.sellerCommissionType === 'fixed' && formData.sellerCommissionFixed ? parseFloat(formData.sellerCommissionFixed) : undefined,
          insuranceCommissionType: formData.insuranceCommissionType,
          insuranceCommissionRate: formData.insuranceCommissionType === 'percentage' && formData.insuranceCommissionRate ? parseFloat(formData.insuranceCommissionRate) : undefined,
          insuranceCommissionFixed: formData.insuranceCommissionType === 'fixed' && formData.insuranceCommissionFixed ? parseFloat(formData.insuranceCommissionFixed) : undefined,
          accessoriesCommissionType: formData.accessoriesCommissionType,
          accessoriesCommissionRate: formData.accessoriesCommissionType === 'percentage' && formData.accessoriesCommissionRate ? parseFloat(formData.accessoriesCommissionRate) : undefined,
          accessoriesCommissionFixed: formData.accessoriesCommissionType === 'fixed' && formData.accessoriesCommissionFixed ? parseFloat(formData.accessoriesCommissionFixed) : undefined,
        }),
      });

      if (response.ok) {
        onClose();
        window.location.reload();
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.error || 'Error al crear vehículo');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear vehículo');
    } finally {
      setLoading(false);
    }
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setPhotos(Array.from(e.target.files));
    }
  }

  function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!videoUploadsEnabled) {
      setShowVideoUpgrade(true);
      e.target.value = '';
      return;
    }
    if (e.target.files) {
      setVideos(Array.from(e.target.files));
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Agregar Vehículo</h2>
        <form onSubmit={handleSubmit}>
          {/* Información Básica */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4 pb-2 border-b">Información Básica</h3>
            <div className="mb-4">
              <VinDecodeField
                enabled={vinCameraEnabled}
                required
                value={formData.vin}
                onChange={(vin) => setFormData({ ...formData, vin })}
                onDecoded={(result) =>
                  setFormData((prev) => ({
                    ...prev,
                    make: result.make || prev.make,
                    model: result.model || prev.model,
                    year: result.year || prev.year,
                    bodyType: result.bodyType || prev.bodyType,
                    engine: result.engine || prev.engine,
                    fuelType: result.fuelType || prev.fuelType,
                    transmission: result.transmission || prev.transmission,
                    doors: result.doors != null ? String(result.doors) : prev.doors,
                  }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">Marca *</label>
                <input
                  type="text"
                  value={formData.make}
                  onChange={(e) =>
                    setFormData({ ...formData, make: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Modelo *</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) =>
                    setFormData({ ...formData, model: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Tipo de Vehículo *</label>
              <select
                value={formData.bodyType}
                onChange={(e) =>
                  setFormData({ ...formData, bodyType: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="">Seleccionar tipo...</option>
                {VEHICLE_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name} - {type.description}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">Año *</label>
                <input
                  type="number"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  value={formData.year}
                  onChange={(e) =>
                    setFormData({ ...formData, year: parseInt(e.target.value) })
                  }
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Precio *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Moneda *</label>
                <select
                  value={formData.currency}
                  onChange={(e) =>
                    setFormData({ ...formData, currency: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="MXN">MXN</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">Condición *</label>
                <select
                  value={formData.condition}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      condition: e.target.value as any,
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="new">Nuevo</option>
                  <option value="used">Usado</option>
                  <option value="certified">Certificado</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Millaje (millas)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.mileage}
                  onChange={(e) =>
                    setFormData({ ...formData, mileage: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                  placeholder="Ej: 0 para nuevo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Cantidad disponible (opcional)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                  placeholder="Unidades idénticas en stock"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Cada venta descuenta 1 unidad automáticamente; al llegar a 0 se marca vendido.
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
                rows={4}
                required
              />
            </div>
          </div>

          {/* Features & Specs */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4 pb-2 border-b">
              <h3 className="text-lg font-semibold">Features & Specs (Opcional)</h3>
              <button
                type="button"
                onClick={() => setShowSpecs(!showSpecs)}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                {showSpecs ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            
            {showSpecs && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 text-xs text-slate-500">
                    El VIN también está arriba (Quick VIN). Aquí puedes ajustarlo.
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      VIN
                    </label>
                    <input
                      type="text"
                      value={formData.vin}
                      onChange={(e) =>
                        setFormData({ ...formData, vin: e.target.value.toUpperCase() })
                      }
                      className="w-full border rounded px-3 py-2"
                      placeholder="Ej: 1FTEW1EP9MFA17916"
                      maxLength={17}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Número de Control (Stock #)
                      <span className="text-xs text-gray-500 block mt-1">
                        Se genera automáticamente si está vacío
                      </span>
                    </label>
                    <input
                      type="text"
                      value={formData.stockNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, stockNumber: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                      placeholder="Se generará automáticamente (ej: STK-20260103-0001)"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Transmisión
                    </label>
                    <select
                      value={formData.transmission}
                      onChange={(e) =>
                        setFormData({ ...formData, transmission: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">Seleccionar...</option>
                      {TRANSMISSION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Tipo de Combustible
                    </label>
                    <select
                      value={formData.fuelType}
                      onChange={(e) =>
                        setFormData({ ...formData, fuelType: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">Seleccionar...</option>
                      {FUEL_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Motor
                    </label>
                    <input
                      type="text"
                      value={formData.engine}
                      onChange={(e) =>
                        setFormData({ ...formData, engine: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                      placeholder="Ej: 1.6L turbocharged GDI 4-Cyl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Tracción
                    </label>
                    <select
                      value={formData.driveType}
                      onChange={(e) =>
                        setFormData({ ...formData, driveType: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">Seleccionar...</option>
                      {DRIVE_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Color Exterior
                    </label>
                    <input
                      type="text"
                      value={formData.exteriorColor}
                      onChange={(e) =>
                        setFormData({ ...formData, exteriorColor: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                      placeholder="Ej: Terracotta Orange"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Color Interior
                    </label>
                    <input
                      type="text"
                      value={formData.interiorColor}
                      onChange={(e) =>
                        setFormData({ ...formData, interiorColor: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                      placeholder="Ej: Grey"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Puertas
                    </label>
                    <input
                      type="number"
                      min="2"
                      max="6"
                      value={formData.doors}
                      onChange={(e) =>
                        setFormData({ ...formData, doors: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                      placeholder="Ej: 4"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Asientos
                    </label>
                    <input
                      type="number"
                      min="2"
                      max="15"
                      value={formData.seats}
                      onChange={(e) =>
                        setFormData({ ...formData, seats: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                      placeholder="Ej: 5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      MPG Ciudad
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.mpgCity}
                      onChange={(e) =>
                        setFormData({ ...formData, mpgCity: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                      placeholder="Ej: 35"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      MPG Carretera
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.mpgHighway}
                      onChange={(e) =>
                        setFormData({ ...formData, mpgHighway: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                      placeholder="Ej: 34"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hasAccidents}
                      onChange={(e) =>
                        setFormData({ ...formData, hasAccidents: e.target.checked })
                      }
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <span className="text-sm font-medium">
                      ¿Tiene accidentes o daños reportados?
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Características Premium
                    <span className="text-xs text-gray-500 block mt-1">
                      Separa múltiples características con comas
                    </span>
                  </label>
                  <textarea
                    value={formData.premiumFeatures}
                    onChange={(e) =>
                      setFormData({ ...formData, premiumFeatures: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                    rows={3}
                    placeholder="Ej: Heated seats, Head-up display, Bose® Premium Audio"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Multimedia */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4 pb-2 border-b">Multimedia</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Fotos *</label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoChange}
                className="w-full border rounded px-3 py-2"
                required
              />
              {photos.length > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  {photos.length} foto(s) seleccionada(s)
                </p>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Videos (opcional)</label>
              <input
                type="file"
                multiple
                accept="video/mp4,video/webm,video/quicktime"
                onChange={handleVideoChange}
                className="w-full border rounded px-3 py-2"
              />
              {videos.length > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  {videos.length} video(s) seleccionado(s)
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              {loading ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
      <UpgradeModal
        isOpen={showVideoUpgrade}
        onClose={() => setShowVideoUpgrade(false)}
        reason="La subida de videos no está incluida en tu plan. Selecciona o activa una membresía que incluya videos de vehículos."
        featureName="Videos de vehículos"
      />
    </div>
  );
}



