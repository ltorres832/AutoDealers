'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import BackButton from '@/components/BackButton';

interface Dealer {
  id: string;
  name: string;
  email: string;
  companyName: string;
}

interface Seller {
  id: string;
  name: string;
  email: string;
  tenantId: string;
}

export default function CreateVehiclePage() {
  const router = useRouter();
  const didPrefillFromUrl = useRef(false);
  const [loading, setLoading] = useState(false);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [filteredSellers, setFilteredSellers] = useState<Seller[]>([]);

  const [formData, setFormData] = useState({
    // Información básica
    make: '',
    model: '',
    year: new Date().getFullYear().toString(),
    vin: '',
    price: '',
    mileage: '',
    
    // Detalles
    condition: 'used',
    color: '',
    transmission: 'automatic',
    fuelType: 'gasoline',
    description: '',
    features: [] as string[],
    
    // Asignación (puede ser ambos)
    dealerId: '',
    sellerId: '',
  });

  const [newFeature, setNewFeature] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchDealers();
    fetchSellers();
  }, []);

  useEffect(() => {
    if (didPrefillFromUrl.current) return;
    const q = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const dealerIdParam = q.get('dealerId');
    const sellerIdParam = q.get('sellerId');
    if (!dealerIdParam && !sellerIdParam) return;
    setFormData((prev) => ({
      ...prev,
      ...(dealerIdParam ? { dealerId: dealerIdParam } : {}),
      ...(sellerIdParam ? { sellerId: sellerIdParam } : {}),
    }));
    didPrefillFromUrl.current = true;
  }, []);

  // Filtrar vendedores cuando cambia el dealer
  useEffect(() => {
    if (formData.dealerId) {
      const filtered = sellers.filter((s) => s.tenantId === formData.dealerId);
      setFilteredSellers(filtered);
      
      // Si el vendedor seleccionado no pertenece al nuevo dealer, limpiarlo
      if (formData.sellerId) {
        const sellerBelongsToDealer = filtered.some((s) => s.id === formData.sellerId);
        if (!sellerBelongsToDealer) {
          setFormData((prev) => ({ ...prev, sellerId: '' }));
        }
      }
    } else {
      setFilteredSellers(sellers);
    }
  }, [formData.dealerId, sellers]);

  async function fetchDealers() {
    try {
      const response = await fetch('/api/admin/dealers/list');
      const data = await response.json();
      setDealers(data.dealers || []);
    } catch (error) {
      console.error('Error:', error);
    }
  }

  async function fetchSellers() {
    try {
      const response = await fetch('/api/admin/sellers/list');
      const data = await response.json();
      setSellers(data.sellers || []);
      setFilteredSellers(data.sellers || []);
    } catch (error) {
      console.error('Error:', error);
    }
  }

  function addFeature() {
    if (newFeature.trim()) {
      setFormData({
        ...formData,
        features: [...formData.features, newFeature.trim()],
      });
      setNewFeature('');
    }
  }

  function removeFeature(index: number) {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index),
    });
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setPhotos(Array.from(e.target.files));
    }
  }

  function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setVideos(Array.from(e.target.files));
    }
  }

  function removePhoto(index: number) {
    setPhotos(photos.filter((_, i) => i !== index));
  }

  function removeVideo(index: number) {
    setVideos(videos.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setUploading(true);

    try {
      // Subir fotos
      const photoUrls: string[] = [];
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
      const videoUrls: string[] = [];
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

      setUploading(false);

      const response = await fetch('/api/admin/vehicles/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          photos: photoUrls.length > 0 ? photoUrls : undefined,
          videos: videoUrls.length > 0 ? videoUrls : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear vehículo');
      }

      alert(data.message || 'Vehículo creado exitosamente');
      router.push('/admin/all-vehicles');
    } catch (error: any) {
      console.error('Error:', error);
      alert(error.message || 'Error al crear vehículo');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <BackButton label="Volver" />
      </div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Crear Vehículo</h1>
        <p className="text-gray-600">
          Agrega un vehículo al inventario y asígnalo a dealer y/o vendedor
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información Básica */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              🚗 Información Básica
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marca *
                </label>
                <input
                  type="text"
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                  placeholder="Toyota"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Modelo *
                </label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                  placeholder="Camry"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Año *
                </label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  VIN
                </label>
                <input
                  type="text"
                  value={formData.vin}
                  onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                  placeholder="1HGBH41JXMN109186"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio *
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                  placeholder="25000"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Millaje (millas)
                </label>
                <input
                  type="number"
                  value={formData.mileage}
                  onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                  placeholder="0 para nuevo"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Detalles */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              📋 Detalles del Vehículo
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Condición
                </label>
                <select
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                >
                  <option value="new">Nuevo</option>
                  <option value="used">Usado</option>
                  <option value="certified">Certificado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                  placeholder="Blanco"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transmisión
                </label>
                <select
                  value={formData.transmission}
                  onChange={(e) => setFormData({ ...formData, transmission: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                >
                  <option value="automatic">Automática</option>
                  <option value="manual">Manual</option>
                  <option value="cvt">CVT</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Combustible
                </label>
                <select
                  value={formData.fuelType}
                  onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                >
                  <option value="gasoline">Gasolina</option>
                  <option value="diesel">Diésel</option>
                  <option value="electric">Eléctrico</option>
                  <option value="hybrid">Híbrido</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                rows={3}
                placeholder="Descripción del vehículo..."
              />
            </div>

            {/* Características */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Características
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                  placeholder="Ej: Cámara trasera"
                />
                <button
                  type="button"
                  onClick={addFeature}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Agregar
                </button>
              </div>
              {formData.features.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.features.map((feature, index) => (
                    <span
                      key={index}
                      className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    >
                      {feature}
                      <button
                        type="button"
                        onClick={() => removeFeature(index)}
                        className="text-primary-600 hover:text-primary-800"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Fotos y Videos */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              📸 Fotos y Videos
            </h2>

            <div className="space-y-4">
              {/* Fotos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fotos del Vehículo
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                />
                {photos.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {photos.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span className="text-sm text-gray-700">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Videos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Videos del Vehículo (opcional)
                </label>
                <input
                  type="file"
                  multiple
                  accept="video/*"
                  onChange={handleVideoChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                />
                {videos.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {videos.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span className="text-sm text-gray-700">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeVideo(index)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Asignación - Dealer Y/O Vendedor */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              🎯 Asignación (Dealer y/o Vendedor)
            </h2>

            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-primary-800">
                <strong>💡 Asignación Flexible:</strong> Puedes asignar el vehículo solo al
                dealer, solo al vendedor, o a AMBOS simultáneamente.
              </p>
            </div>

            <div className="space-y-4">
              {/* Dealer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dealer (opcional)
                </label>
                <select
                  value={formData.dealerId}
                  onChange={(e) => setFormData({ ...formData, dealerId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">-- Sin dealer específico --</option>
                  {dealers.map((dealer) => (
                    <option key={dealer.id} value={dealer.id}>
                      {dealer.name}
                      {dealer.companyName && ` (${dealer.companyName})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vendedor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendedor (opcional)
                </label>
                <select
                  value={formData.sellerId}
                  onChange={(e) => setFormData({ ...formData, sellerId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                  disabled={!formData.dealerId && filteredSellers.length === 0}
                >
                  <option value="">-- Sin vendedor específico --</option>
                  {filteredSellers.map((seller) => (
                    <option key={seller.id} value={seller.id}>
                      {seller.name} ({seller.email})
                    </option>
                  ))}
                </select>
                {formData.dealerId && (
                  <p className="text-xs text-gray-500 mt-1">
                    Mostrando {filteredSellers.length} vendedores del dealer seleccionado
                  </p>
                )}
              </div>

              {/* Preview de asignación */}
              {(formData.dealerId || formData.sellerId) && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800 font-medium mb-2">
                    ✅ Asignación configurada:
                  </p>
                  <ul className="text-sm text-green-700 space-y-1">
                    {formData.dealerId && (
                      <li>
                        • <strong>Dealer:</strong>{' '}
                        {dealers.find((d) => d.id === formData.dealerId)?.name}
                      </li>
                    )}
                    {formData.sellerId && (
                      <li>
                        • <strong>Vendedor:</strong>{' '}
                        {filteredSellers.find((s) => s.id === formData.sellerId)?.name}
                      </li>
                    )}
                  </ul>
                  {formData.dealerId && formData.sellerId && (
                    <p className="text-xs text-green-600 mt-2">
                      Ambos recibirán notificación del nuevo vehículo
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || uploading || (!formData.dealerId && !formData.sellerId)}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {uploading ? 'Subiendo archivos...' : loading ? 'Creando...' : 'Crear Vehículo'}
            </button>
          </div>

          {!formData.dealerId && !formData.sellerId && (
            <p className="text-sm text-red-600 text-center">
              Debes asignar el vehículo a un dealer y/o vendedor
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

