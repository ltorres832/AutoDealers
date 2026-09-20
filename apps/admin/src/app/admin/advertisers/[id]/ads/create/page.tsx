'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

import { listAdPlacementOptions, type AdPlacement } from '@autodealers/core/ad-placements';
import { AdPlacementPageMap } from '@/components/AdPlacementPageMap';

type AdType = 'banner' | 'promotion' | 'sponsor';
type Placement = AdPlacement;
type MediaType = 'image' | 'video';
type Animation = 'none' | 'fade' | 'slide' | 'kenburns';

const MAX_IMAGES = 8;

const PLACEMENT_OPTIONS = listAdPlacementOptions().map((item) => ({
  id: item.id,
  label: item.label,
  description: item.description,
  where: item.where,
  notWhere: item.notWhere,
  size: item.pixelSize,
}));

export default function AdminCreateAdForAdvertiser() {
  const router = useRouter();
  const params = useParams();
  const advertiserId = params?.id as string;

  const [formData, setFormData] = useState({
    campaignName: '',
    type: 'banner' as AdType,
    placement: 'vehicle_page' as Placement,
    durationDays: 7 as 7 | 15 | 30,
    mediaType: 'image' as MediaType,
    title: '',
    description: '',
    imageUrl: '',
    images: [] as string[],
    animation: 'fade' as Animation,
    videoUrl: '',
    linkUrl: '',
    linkType: 'external' as 'external' | 'landing_page',
    price: 0,
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [pricing, setPricing] = useState<Record<string, Record<number, number>>>({});

  useEffect(() => {
    fetch('/api/admin/pricing-config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const banners = data?.config?.banners;
        if (banners) {
          const next: Record<string, Record<number, number>> = {};
          for (const [key, value] of Object.entries(banners) as [string, { prices?: Record<number, number> }][]) {
            if (value?.prices) next[key] = value.prices;
          }
          setPricing(next);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const listed = pricing[formData.placement]?.[formData.durationDays];
    if (typeof listed === 'number' && listed > 0) {
      setFormData((prev) => ({ ...prev, price: listed }));
    }
  }, [formData.placement, formData.durationDays, pricing]);

  const selectedPlacement = PLACEMENT_OPTIONS.find((item) => item.id === formData.placement);

  async function uploadFiles(files: File[]) {
    const remaining = MAX_IMAGES - formData.images.length;
    if (remaining <= 0) {
      setError(`Máximo ${MAX_IMAGES} fotos por anuncio.`);
      return;
    }
    setUploading(true);
    setError('');
    try {
      const uploaded: string[] = [];
      for (const file of files.slice(0, remaining)) {
        const body = new FormData();
        body.append('file', file);
        body.append('type', 'sponsored_content');
        const res = await fetch('/api/upload', { method: 'POST', body });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.url) {
          throw new Error(data.error || 'Error al subir imagen');
        }
        uploaded.push(data.url);
      }
      setFormData((prev) => {
        const next = Array.from(new Set([...prev.images, ...uploaded])).slice(0, MAX_IMAGES);
        return { ...prev, images: next, imageUrl: next[0] || prev.imageUrl };
      });
    } catch (err: any) {
      setError(err.message || 'Error al subir imagen');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (formData.mediaType === 'image' && !formData.imageUrl && formData.images.length === 0) {
        setError('Debes proporcionar al menos una imagen');
        setLoading(false);
        return;
      }
      if (formData.mediaType === 'video' && !formData.videoUrl) {
        setError('Debes proporcionar un video');
        setLoading(false);
        return;
      }

      const images =
        formData.mediaType === 'image'
          ? Array.from(new Set([formData.imageUrl, ...formData.images].filter(Boolean))).slice(0, MAX_IMAGES)
          : [];

      const res = await fetch(`/api/admin/advertisers/${advertiserId}/ads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          images,
          animation: formData.animation,
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
          <p className="text-sm text-gray-600">
            Mismos campos que el anunciante: slideshow, animación, ubicación (incluye ficha del vehículo) y precio.
          </p>
        </div>
        <Link href={`/admin/advertisers/${advertiserId}`} className="text-primary-600 hover:text-primary-700 text-sm font-semibold">
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de campaña (opcional)</label>
            <input
              type="text"
              value={formData.campaignName}
              onChange={(e) => setFormData({ ...formData, campaignName: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Título (opcional)</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ¿Dónde va a salir el anuncio?
          </label>
          <select
            value={formData.placement}
            onChange={(e) => setFormData({ ...formData, placement: e.target.value as Placement })}
            className="w-full border border-gray-300 rounded-lg px-4 py-2"
          >
            {PLACEMENT_OPTIONS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label} — {item.size}
              </option>
            ))}
          </select>
          {selectedPlacement && (
            <div className="mt-3 rounded-lg border border-primary-200 bg-primary-50 p-3">
              <p className="text-sm font-semibold text-gray-900">
                Tamaño exacto: {selectedPlacement.size}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-gray-700">{selectedPlacement.where}</p>
              <p className="mt-1 text-sm font-medium text-amber-800">{selectedPlacement.notWhere}</p>
            </div>
          )}
          <div className="mt-3">
            <AdPlacementPageMap placement={formData.placement} />
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
                Imagen / slideshow
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="mediaType"
                  value="video"
                  checked={formData.mediaType === 'video'}
                  onChange={() => setFormData({ ...formData, mediaType: 'video', imageUrl: '', images: [] })}
                />
                Video
              </label>
            </div>
          </div>
        </div>

        {formData.mediaType === 'image' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Imágenes del anuncio (slideshow, hasta {MAX_IMAGES})
              </label>
              <p className="text-xs text-gray-600 mb-2">
                Varias fotos rotan dentro del mismo anuncio. Sube archivos o pega URLs.
              </p>
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={uploading || formData.images.length >= MAX_IMAGES}
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length) void uploadFiles(files);
                  e.target.value = '';
                }}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              />
              {uploading && <p className="text-xs text-gray-500 mt-1">Subiendo...</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Agregar URL de imagen</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  placeholder="https://..."
                />
                <button
                  type="button"
                  onClick={() => {
                    const url = formData.imageUrl.trim();
                    if (!url) return;
                    setFormData((prev) => {
                      const next = Array.from(new Set([...prev.images, url])).slice(0, MAX_IMAGES);
                      return { ...prev, images: next, imageUrl: next[0] || url };
                    });
                  }}
                  className="shrink-0 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white"
                >
                  Agregar
                </button>
              </div>
            </div>
            {formData.images.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {formData.images.map((url, index) => (
                  <div key={`${url}-${index}`} className="relative overflow-hidden rounded-lg border">
                    <img src={url} alt={`Foto ${index + 1}`} className="h-20 w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => {
                          const next = prev.images.filter((_, i) => i !== index);
                          return { ...prev, images: next, imageUrl: next[0] || '' };
                        });
                      }}
                      className="absolute right-1 top-1 rounded bg-black/60 px-1.5 text-xs text-white"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Animación del slideshow</label>
              <select
                value={formData.animation}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    animation: e.target.value as Animation,
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              >
                <option value="fade">Fundido (fade) — transiciona suave entre fotos</option>
                <option value="slide">Deslizamiento — entra de lado</option>
                <option value="kenburns">Ken Burns — zoom lento profesional</option>
                <option value="none">Sin movimiento</option>
              </select>
            </div>
          </div>
        )}

        {formData.mediaType === 'video' && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Video (subir o pegar URL)</label>
            <input
              type="url"
              value={formData.videoUrl}
              onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
              placeholder="https://..."
            />
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              disabled={uploading}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                setUploading(true);
                setError('');
                try {
                  const body = new FormData();
                  body.append('file', file);
                  body.append('type', 'sponsored_content');
                  const res = await fetch('/api/upload', { method: 'POST', body });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok || !data.url) {
                    throw new Error(data.error || 'Error al subir video');
                  }
                  setFormData((prev) => ({ ...prev, videoUrl: data.url }));
                } catch (err: any) {
                  setError(err.message || 'Error al subir video');
                } finally {
                  setUploading(false);
                }
              }}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            />
            <p className="text-xs text-gray-600">Formatos: MP4/WebM. Máx. 100MB.</p>
            {uploading && <p className="text-xs text-gray-500">Subiendo...</p>}
            {formData.videoUrl ? (
              <video src={formData.videoUrl} controls className="mt-2 max-h-48 w-full rounded bg-black" />
            ) : null}
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
          <label className="block text-sm font-medium text-gray-700 mb-2">Precio / presupuesto (total)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
            className="w-full border border-gray-300 rounded-lg px-4 py-2"
            placeholder="Ej: 199.99"
          />
          <p className="mt-1 text-xs text-gray-500">
            Se rellena con el precio de Admin → Precios y Duraciones para esta ubicación y duración. Puedes
            ajustarlo. Configura los precios en{' '}
            <Link href="/admin/pricing-config" className="text-primary-600 font-semibold">
              Precios y Duraciones
            </Link>
            .
          </p>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold disabled:opacity-50"
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
