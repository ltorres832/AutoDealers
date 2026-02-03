'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BackButton from '@/components/BackButton';

interface Tenant {
  id: string;
  name: string;
  type: 'dealer' | 'seller';
  companyName?: string;
}

export default function CreateCampaignPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [videoPreview, setVideoPreview] = useState<string>('');
  const [formData, setFormData] = useState({
    tenantId: '',
    name: '',
    type: 'ad',
    platforms: [] as string[],
    content: '',
    imageUrl: '',
    videoUrl: '',
    hashtags: '',
    publishNow: false,
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  async function fetchTenants() {
    try {
      const response = await fetch('/api/admin/tenants');
      const data = await response.json();
      setTenants(data.tenants || []);
    } catch (error) {
      console.error('Error:', error);
    }
  }

  async function uploadFile(file: File, type: 'campaign' | 'promotion' | 'review'): Promise<string> {
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append('type', type);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: uploadFormData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al subir archivo');
    }

    const data = await response.json();
    return data.url;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setUploading(true);

    try {
      let imageUrl = formData.imageUrl;
      let videoUrl = formData.videoUrl;

      // Subir imagen si hay una
      if (imageFile) {
        imageUrl = await uploadFile(imageFile, 'campaign');
      }

      // Subir video si hay uno
      if (videoFile) {
        videoUrl = await uploadFile(videoFile, 'campaign');
      }

      setUploading(false);

      const response = await fetch('/api/admin/campaigns/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          imageUrl: imageUrl || undefined,
          videoUrl: videoUrl || undefined,
          hashtags: formData.hashtags.split(',').map((h) => h.trim()).filter(Boolean),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Campaña creada exitosamente');
        router.push('/admin/all-campaigns');
      } else {
        alert(`Error: ${data.error || 'Error al crear la campaña'}`);
      }
    } catch (error: any) {
      setUploading(false);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVideoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setVideoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview('');
    setFormData({ ...formData, imageUrl: '' });
  }

  function removeVideo() {
    setVideoFile(null);
    setVideoPreview('');
    setFormData({ ...formData, videoUrl: '' });
  }

  function togglePlatform(platform: string) {
    setFormData((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <BackButton href="/admin/all-campaigns" label="Volver a Campañas" />
      </div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Crear Campaña</h1>
        <p className="text-gray-600 mt-2">
          Crea una campaña para un dealer o vendedor. Se publicará automáticamente si tienen credenciales configuradas.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Selección de Tenant */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Tenant (Dealer/Vendedor) *
          </label>
          <select
            value={formData.tenantId}
            onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
            className="w-full border rounded px-3 py-2"
            required
          >
            <option value="">Seleccionar tenant...</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name} {tenant.companyName ? `(${tenant.companyName})` : ''} - {tenant.type}
              </option>
            ))}
          </select>
        </div>

        {/* Nombre de la Campaña */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Nombre de la Campaña *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full border rounded px-3 py-2"
            required
            placeholder="Ej: Campaña de Verano 2024"
          />
        </div>

        {/* Tipo */}
        <div>
          <label className="block text-sm font-medium mb-2">Tipo *</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full border rounded px-3 py-2"
            required
          >
            <option value="ad">Anuncio</option>
            <option value="promotion">Promoción</option>
            <option value="event">Evento</option>
            <option value="news">Noticia</option>
          </select>
        </div>

        {/* Plataformas */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Plataformas (selecciona las plataformas donde se publicará)
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.platforms.includes('facebook')}
                onChange={() => togglePlatform('facebook')}
              />
              <span>Facebook</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.platforms.includes('instagram')}
                onChange={() => togglePlatform('instagram')}
              />
              <span>Instagram</span>
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Solo se publicará en las plataformas donde el tenant tenga credenciales configuradas
          </p>
        </div>

        {/* Contenido */}
        <div>
          <label className="block text-sm font-medium mb-2">Contenido *</label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            className="w-full border rounded px-3 py-2"
            rows={5}
            required
            placeholder="Texto del anuncio o campaña..."
          />
        </div>

        {/* Imagen */}
        <div>
          <label className="block text-sm font-medium mb-2">Imagen</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full border rounded px-3 py-2"
          />
          {imagePreview && (
            <div className="mt-2 relative inline-block">
              <img src={imagePreview} alt="Preview" className="max-w-xs max-h-48 rounded" />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700"
              >
                ×
              </button>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">Máximo 10MB. Formatos: JPG, PNG, GIF</p>
        </div>

        {/* Video */}
        <div>
          <label className="block text-sm font-medium mb-2">Video</label>
          <input
            type="file"
            accept="video/*"
            onChange={handleVideoChange}
            className="w-full border rounded px-3 py-2"
          />
          {videoPreview && (
            <div className="mt-2 relative inline-block">
              <video src={videoPreview} controls className="max-w-xs max-h-48 rounded" />
              <button
                type="button"
                onClick={removeVideo}
                className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700"
              >
                ×
              </button>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">Máximo 100MB. Formatos: MP4, MOV, AVI</p>
        </div>

        {/* Hashtags */}
        <div>
          <label className="block text-sm font-medium mb-2">Hashtags (separados por comas)</label>
          <input
            type="text"
            value={formData.hashtags}
            onChange={(e) => setFormData({ ...formData, hashtags: e.target.value })}
            className="w-full border rounded px-3 py-2"
            placeholder="autos, venta, promocion"
          />
        </div>

        {/* Publicar Ahora */}
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.publishNow}
              onChange={(e) => setFormData({ ...formData, publishNow: e.target.checked })}
            />
            <span className="font-medium">Publicar inmediatamente en redes sociales</span>
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Si está marcado, se publicará automáticamente si el tenant tiene credenciales configuradas
          </p>
        </div>

        {/* Botones */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading || uploading}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
          >
            {uploading ? 'Subiendo archivos...' : loading ? 'Creando...' : 'Crear Campaña'}
          </button>
          <Link
            href="/admin/all-campaigns"
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}

