'use client';

import { useState, useEffect } from 'react';
import { getSpecsDescription, validateImage, validateVideo } from '@/lib/advertiser-specs-client';

interface Advertiser {
  id: string;
  companyName: string;
  email: string;
  plan: string;
}

export default function CreateSponsoredContentModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [selectedAdvertiser, setSelectedAdvertiser] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'banner' as 'banner' | 'promotion' | 'sponsor',
    placement: 'sponsors_section' as 'hero' | 'sidebar' | 'sponsors_section' | 'between_content',
    linkUrl: '',
    linkType: 'external' as 'external' | 'landing_page',
    budget: '',
    budgetType: 'monthly' as 'monthly' | 'total',
    startDate: '',
    endDate: '',
    targetLocation: [] as string[],
    targetVehicleTypes: [] as string[],
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationInput, setLocationInput] = useState('');
  const [vehicleTypeInput, setVehicleTypeInput] = useState('');

  useEffect(() => {
    fetchAdvertisers();
  }, []);

  async function fetchAdvertisers() {
    try {
      const response = await fetch('/api/admin/advertisers');
      if (response.ok) {
        const data = await response.json();
        setAdvertisers(data.advertisers || []);
      }
    } catch (error) {
      console.error('Error fetching advertisers:', error);
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImage(file, formData.placement);
    if (!validation.valid) {
      setError(validation.error || 'Imagen inválida');
      return;
    }

    setImageFile(file);
    setError(null);

    // Crear preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateVideo(file, formData.placement);
    if (!validation.valid) {
      setError(validation.error || 'Video inválido');
      return;
    }

    setVideoFile(file);
    setError(null);

    // Crear preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setVideoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedAdvertiser) {
      setError('Debes seleccionar un anunciante');
      return;
    }

    if (!imageFile && !videoFile) {
      setError('Debes subir una imagen o video');
      return;
    }

    if (!formData.linkUrl) {
      setError('Debes proporcionar una URL de destino');
      return;
    }

    setLoading(true);

    try {
      // Subir imagen si existe
      let imageUrl = '';
      if (imageFile) {
        const formDataImage = new FormData();
        formDataImage.append('file', imageFile);
        formDataImage.append('type', 'sponsored_content');

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formDataImage,
        });

        if (!uploadResponse.ok) {
          throw new Error('Error al subir imagen');
        }

        const uploadData = await uploadResponse.json();
        imageUrl = uploadData.url;
      }

      // Subir video si existe
      let videoUrl = '';
      if (videoFile) {
        const formDataVideo = new FormData();
        formDataVideo.append('file', videoFile);
        formDataVideo.append('type', 'sponsored_content');

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formDataVideo,
        });

        if (!uploadResponse.ok) {
          throw new Error('Error al subir video');
        }

        const uploadData = await uploadResponse.json();
        videoUrl = uploadData.url;
      }

      // Crear contenido patrocinado
      const advertiser = advertisers.find((a) => a.id === selectedAdvertiser);
      const response = await fetch('/api/admin/sponsored-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          advertiserId: selectedAdvertiser,
          advertiserName: advertiser?.companyName || '',
          title: formData.title,
          description: formData.description,
          type: formData.type,
          placement: formData.placement,
          imageUrl,
          videoUrl: videoUrl || undefined,
          linkUrl: formData.linkUrl,
          linkType: formData.linkType,
          budget: parseFloat(formData.budget) * 100, // Convertir a centavos
          budgetType: formData.budgetType,
          startDate: new Date(formData.startDate).toISOString(),
          endDate: new Date(formData.endDate).toISOString(),
          targetLocation: formData.targetLocation.length > 0 ? formData.targetLocation : undefined,
          targetVehicleTypes: formData.targetVehicleTypes.length > 0 ? formData.targetVehicleTypes : undefined,
          status: 'pending', // El admin puede aprobar después
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear contenido');
      }

      onSuccess();
    } catch (error: any) {
      setError(error.message || 'Error al crear contenido patrocinado');
    } finally {
      setLoading(false);
    }
  }

  const specs = getSpecsDescription(formData.placement);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Crear Contenido Patrocinado</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Seleccionar Anunciante */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Anunciante *
            </label>
            <select
              value={selectedAdvertiser}
              onChange={(e) => setSelectedAdvertiser(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            >
              <option value="">Seleccionar anunciante...</option>
              {advertisers.map((advertiser) => (
                <option key={advertiser.id} value={advertiser.id}>
                  {advertiser.companyName} ({advertiser.email}) - Plan {advertiser.plan}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo y Placement */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="banner">Banner</option>
                <option value="promotion">Promoción</option>
                <option value="sponsor">Patrocinador</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ubicación (Placement) *
              </label>
              <select
                value={formData.placement}
                onChange={(e) => {
                  setFormData({ ...formData, placement: e.target.value as any });
                  setImageFile(null);
                  setVideoFile(null);
                  setImagePreview(null);
                  setVideoPreview(null);
                }}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="sponsors_section">Sección Patrocinadores</option>
                <option value="sidebar">Sidebar</option>
                <option value="hero">Hero (Solo Premium)</option>
                <option value="between_content">Entre Contenido</option>
              </select>
            </div>
          </div>

          {/* Especificaciones */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">📐 Especificaciones Requeridas:</h3>
            <p className="text-sm text-blue-800 mb-1">{specs.image}</p>
            {specs.video && (
              <p className="text-sm text-blue-800">{specs.video}</p>
            )}
          </div>

          {/* Título y Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          {/* URL de Destino */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL de Destino (donde redirigir al hacer click) *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <select
                value={formData.linkType}
                onChange={(e) => setFormData({ ...formData, linkType: e.target.value as any })}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="external">URL Externa</option>
                <option value="landing_page">Página de Aterrizaje</option>
              </select>
              <input
                type="url"
                value={formData.linkUrl}
                onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                placeholder="https://ejemplo.com"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Cuando el usuario haga click en el anuncio, será redirigido a esta URL
            </p>
          </div>

          {/* Imagen */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Imagen *
            </label>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleImageChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {imagePreview && (
              <div className="mt-4">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-w-md h-48 object-contain border border-gray-200 rounded-lg"
                />
              </div>
            )}
          </div>

          {/* Video (opcional) */}
          {formData.placement !== 'between_content' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Video (Opcional)
              </label>
              <input
                type="file"
                accept="video/mp4,video/webm"
                onChange={handleVideoChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {videoPreview && (
                <div className="mt-4">
                  <video
                    src={videoPreview}
                    controls
                    className="max-w-md h-48 border border-gray-200 rounded-lg"
                  />
                </div>
              )}
            </div>
          )}

          {/* Presupuesto y Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Presupuesto *
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
                <select
                  value={formData.budgetType}
                  onChange={(e) => setFormData({ ...formData, budgetType: e.target.value as any })}
                  className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="monthly">Mensual</option>
                  <option value="total">Total</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Inicio *
              </label>
              <input
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Fin *
              </label>
              <input
                type="datetime-local"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
          </div>

          {/* Targeting (opcional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ubicaciones Objetivo (Opcional)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (locationInput.trim() && !formData.targetLocation.includes(locationInput.trim())) {
                      setFormData({
                        ...formData,
                        targetLocation: [...formData.targetLocation, locationInput.trim()],
                      });
                      setLocationInput('');
                    }
                  }
                }}
                placeholder="Ej: Nueva York, Miami"
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (locationInput.trim() && !formData.targetLocation.includes(locationInput.trim())) {
                    setFormData({
                      ...formData,
                      targetLocation: [...formData.targetLocation, locationInput.trim()],
                    });
                    setLocationInput('');
                  }
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Agregar
              </button>
            </div>
            {formData.targetLocation.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.targetLocation.map((loc, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm flex items-center gap-2"
                  >
                    {loc}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          targetLocation: formData.targetLocation.filter((_, i) => i !== idx),
                        });
                      }}
                      className="text-purple-600 hover:text-purple-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear Contenido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

