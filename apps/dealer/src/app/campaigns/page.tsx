'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Campaign {
  id: string;
  name: string;
  type: string;
  platforms: string[];
  status: string;
  budgets: Array<{ platform: string; amount: number; currency: string }>;
  metrics?: {
    impressions: number;
    clicks: number;
    leads: number;
    spend: number;
  };
  createdAt: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  async function fetchCampaigns() {
    try {
      const response = await fetch('/api/campaigns');
      const data = await response.json();
      setCampaigns(data.campaigns || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Campañas de Publicidad</h1>
          <p className="text-gray-600 mt-2">
            Crea y gestiona todas tus campañas desde un solo lugar. La IA te ayudará
            a crear contenido y optimizar tus campañas.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium"
        >
          + Nueva Campaña
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">📢</div>
          <h2 className="text-xl font-bold mb-2">No hay campañas creadas</h2>
          <p className="text-gray-600 mb-6">
            Crea tu primera campaña para empezar a generar más leads
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700"
          >
            Crear Primera Campaña
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold">{campaign.name}</h3>
                <span
                  className={`px-3 py-1 rounded text-xs ${
                    campaign.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : campaign.status === 'paused'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {campaign.status === 'active' ? 'Activa' : campaign.status === 'paused' ? 'Pausada' : 'Borrador'}
                </span>
              </div>

              <div className="mb-4">
                <div className="flex gap-2 flex-wrap">
                  {campaign.platforms.map((platform) => (
                    <span
                      key={platform}
                      className="px-2 py-1 bg-gray-100 rounded text-xs capitalize"
                    >
                      {platform}
                    </span>
                  ))}
                </div>
              </div>

              {campaign.metrics && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Impresiones</p>
                    <p className="font-bold">{campaign.metrics.impressions.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Clics</p>
                    <p className="font-bold">{campaign.metrics.clicks.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Leads</p>
                    <p className="font-bold">{campaign.metrics.leads}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Gastado</p>
                    <p className="font-bold">
                      ${campaign.metrics.spend.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-gray-500">
                  Presupuesto total:{' '}
                  <span className="font-medium">
                    {campaign.budgets
                      .reduce((sum, b) => sum + b.amount, 0)
                      .toLocaleString()}{' '}
                    {campaign.budgets[0]?.currency || 'USD'}
                  </span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateCampaignModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchCampaigns();
          }}
        />
      )}
    </div>
  );
}

function CreateCampaignModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'social_media',
    platforms: [] as string[],
    budgets: [] as Array<{ platform: string; amount: number; currency: string }>,
    status: 'draft',
    content: '',
    images: [] as string[],
    videos: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [platformBudget, setPlatformBudget] = useState({ amount: 0, currency: 'USD' });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);

  const availablePlatforms = ['facebook', 'instagram', 'whatsapp', 'email'];

  async function uploadFiles(files: File[], type: 'image' | 'video'): Promise<string[]> {
    const urls: string[] = [];
    for (const file of files) {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('type', 'campaign');
      
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });
      
      if (uploadResponse.ok) {
        const { url } = await uploadResponse.json();
        urls.push(url);
      }
    }
    return urls;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name || !formData.description || !formData.content || formData.platforms.length === 0) {
      alert('Por favor completa todos los campos obligatorios (nombre, descripción, contenido) y selecciona al menos una plataforma');
      return;
    }
    setLoading(true);
    setUploading(true);
    try {
      // Subir imágenes
      if (imageFiles.length > 0) {
        const imageUrls = await uploadFiles(imageFiles, 'image');
        formData.images = imageUrls;
      }
      
      // Subir videos
      if (videoFiles.length > 0) {
        const videoUrls = await uploadFiles(videoFiles, 'video');
        formData.videos = videoUrls;
      }
      
      setUploading(false);
      
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert('Campaña creada exitosamente');
        onSuccess();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al crear campaña');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear campaña');
      setUploading(false);
    } finally {
      setLoading(false);
    }
  }
  
  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setImageFiles([...imageFiles, ...files]);
    }
  }
  
  function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setVideoFiles([...videoFiles, ...files]);
    }
  }
  
  function removeImage(index: number) {
    setImageFiles(imageFiles.filter((_, i) => i !== index));
  }
  
  function removeVideo(index: number) {
    setVideoFiles(videoFiles.filter((_, i) => i !== index));
  }

  function addPlatform() {
    if (selectedPlatform && !formData.platforms.includes(selectedPlatform)) {
      setFormData({
        ...formData,
        platforms: [...formData.platforms, selectedPlatform],
        budgets: [
          ...formData.budgets,
          { platform: selectedPlatform, ...platformBudget },
        ],
      });
      setSelectedPlatform('');
      setPlatformBudget({ amount: 0, currency: 'USD' });
    }
  }

  function removePlatform(platform: string) {
    setFormData({
      ...formData,
      platforms: formData.platforms.filter((p) => p !== platform),
      budgets: formData.budgets.filter((b) => b.platform !== platform),
    });
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">Crear Nueva Campaña</h2>
          <p className="text-sm text-gray-600 mt-1">
            Crea una campaña de marketing para promocionar tus vehículos
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nombre de la Campaña *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
              placeholder="Ej: Promoción de Verano 2024"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Descripción *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border rounded px-3 py-2"
              rows={3}
              required
              placeholder="Describe tu campaña..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Tipo de Campaña</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="social_media">Redes Sociales</option>
              <option value="email">Email Marketing</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Plataformas *</label>
            <div className="flex gap-2 mb-2">
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="flex-1 border rounded px-3 py-2"
              >
                <option value="">Seleccionar plataforma</option>
                {availablePlatforms
                  .filter((p) => !formData.platforms.includes(p))
                  .map((platform) => (
                    <option key={platform} value={platform}>
                      {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </option>
                  ))}
              </select>
              <input
                type="number"
                value={platformBudget.amount}
                onChange={(e) =>
                  setPlatformBudget({ ...platformBudget, amount: Number(e.target.value) })
                }
                className="w-32 border rounded px-3 py-2"
                placeholder="Presupuesto"
                min="0"
              />
              <select
                value={platformBudget.currency}
                onChange={(e) =>
                  setPlatformBudget({ ...platformBudget, currency: e.target.value })
                }
                className="w-24 border rounded px-3 py-2"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="MXN">MXN</option>
              </select>
              <button
                type="button"
                onClick={addPlatform}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Agregar
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.platforms.map((platform) => {
                const budget = formData.budgets.find((b) => b.platform === platform);
                return (
                  <div
                    key={platform}
                    className="flex items-center gap-2 px-3 py-1 bg-primary-100 text-primary-700 rounded"
                  >
                    <span className="text-sm font-medium">
                      {platform.charAt(0).toUpperCase() + platform.slice(1)}
                      {budget && ` - ${budget.currency} ${budget.amount.toLocaleString()}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => removePlatform(platform)}
                      className="text-red-600 hover:text-red-700"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Contenido *</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full border rounded px-3 py-2"
              rows={4}
              required
              placeholder="Escribe el contenido de tu campaña..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Fotos (opcional)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className="w-full border rounded px-3 py-2"
            />
            {imageFiles.length > 0 && (
              <div className="mt-2 space-y-2">
                {imageFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span className="text-sm text-gray-700">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Videos (opcional)</label>
            <input
              type="file"
              accept="video/*"
              multiple
              onChange={handleVideoChange}
              className="w-full border rounded px-3 py-2"
            />
            {videoFiles.length > 0 && (
              <div className="mt-2 space-y-2">
                {videoFiles.map((file, index) => (
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

          <div>
            <label className="block text-sm font-medium mb-2">Estado</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="draft">Borrador</option>
              <option value="active">Activa</option>
              <option value="paused">Pausada</option>
            </select>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || uploading}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
            >
              {uploading ? 'Subiendo archivos...' : loading ? 'Creando...' : 'Crear Campaña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



