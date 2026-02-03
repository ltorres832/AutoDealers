'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

type AdType = 'banner' | 'promotion' | 'sponsor';
type Placement = 'hero' | 'sidebar' | 'sponsors_section' | 'between_content';
type MediaType = 'image' | 'video';

export default function AdminCreateAdForAdvertiser() {
  const router = useRouter();
  const params = useParams();
  const advertiserId = params?.id as string;

  const [formData, setFormData] = useState({
    campaignName: '',
    type: 'banner' as AdType,
    placement: 'sidebar' as Placement,
    durationDays: 7 as 7 | 15 | 30,
    mediaType: 'image' as MediaType,
    title: '',
    description: '',
    imageUrl: '',
    videoUrl: '',
    linkUrl: '',
    linkType: 'external' as 'external' | 'landing_page',
    price: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (formData.mediaType === 'image' && !formData.imageUrl) {
        setError('Debes proporcionar una imagen');
        setLoading(false);
        return;
      }
      if (formData.mediaType === 'video' && !formData.videoUrl) {
        setError('Debes proporcionar un video');
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/admin/advertisers/${advertiserId}/ads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        router.push(`/admin/advertisers/${advertiserId}`);
      } else {
        setError(data.error || 'Error al crear anuncio');
      }
    } catch (err: any) {
      setError(err.message || 'Error al crear anuncio');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Crear anuncio para anunciante</h1>
          <p className="text-sm text-gray-600">ID anunciante: {advertiserId}</p>
        </div>
        <Link href={`/admin/advertisers/${advertiserId}`} className="text-blue-600 hover:text-blue-700 text-sm font-semibold">
          ← Volver
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de campaña *</label>
            <input
              type="text"
              value={formData.campaignName}
              onChange={(e) => setFormData({ ...formData, campaignName: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Título *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-4 py-2"
            rows={4}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as AdType })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            >
              <option value="banner">Banner</option>
              <option value="promotion">Promoción</option>
              <option value="sponsor">Patrocinador</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ubicación</label>
            <select
              value={formData.placement}
              onChange={(e) => setFormData({ ...formData, placement: e.target.value as Placement })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            >
              <option value="hero">Hero (Principal)</option>
              <option value="sidebar">Sidebar</option>
              <option value="sponsors_section">Sección Patrocinadores</option>
              <option value="between_content">Entre Contenido</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Duración</label>
            <select
              value={formData.durationDays}
              onChange={(e) => setFormData({ ...formData, durationDays: Number(e.target.value) as 7 | 15 | 30 })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            >
              <option value={7}>7 días</option>
              <option value={15}>15 días</option>
              <option value={30}>30 días</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Medio</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="mediaType"
                  value="image"
                  checked={formData.mediaType === 'image'}
                  onChange={() => setFormData({ ...formData, mediaType: 'image', videoUrl: '' })}
                />
                Imagen
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="mediaType"
                  value="video"
                  checked={formData.mediaType === 'video'}
                  onChange={() => setFormData({ ...formData, mediaType: 'video', imageUrl: '' })}
                />
                Video
              </label>
            </div>
          </div>
        </div>

        {formData.mediaType === 'image' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Imagen (URL)</label>
            <input
              type="url"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
              placeholder="https://..."
            />
          </div>
        )}

        {formData.mediaType === 'video' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Video (URL)</label>
            <input
              type="url"
              value={formData.videoUrl}
              onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
              placeholder="https://..."
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">URL de destino *</label>
            <input
              type="url"
              value={formData.linkUrl}
              onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
              placeholder="https://..."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de enlace</label>
            <select
              value={formData.linkType}
              onChange={(e) => setFormData({ ...formData, linkType: e.target.value as 'external' | 'landing_page' })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            >
              <option value="external">Externo</option>
              <option value="landing_page">Landing Page</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Precio/Presupuesto (total)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
            className="w-full border border-gray-300 rounded-lg px-4 py-2"
            placeholder="Ej: 199.99"
          />
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50"
          >
            {loading ? 'Creando...' : 'Crear anuncio'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}


