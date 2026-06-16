'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PromoVideosEditor } from '@autodealers/shared/components/PromoVideosEditor';
import {
  normalizePublicTrustGalleryItems,
  type PublicTrustGalleryItem,
} from '@autodealers/shared/public-trust-gallery';
import { PublicTrustGallerySection } from '@/components/PublicTrustGallerySection';

export default function DealerSellerPublicPageSettings() {
  const [publicPromoVideoUrls, setPublicPromoVideoUrls] = useState<string[]>([]);
  const [publicTrustGalleryItems, setPublicTrustGalleryItems] = useState<PublicTrustGalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [galleryUploadError, setGalleryUploadError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setMessage(null);
    try {
      const { fetchWithAuth } = await import('@/lib/fetch-with-auth');
      const res = await fetchWithAuth('/api/settings/seller-public-catalog', {});
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage(err.error || 'No se pudo cargar');
        return;
      }
      const data = await res.json();
      setPublicPromoVideoUrls(
        Array.isArray(data.publicPromoVideoUrls)
          ? data.publicPromoVideoUrls
          : data.publicPromoVideoUrl
            ? [data.publicPromoVideoUrl]
            : []
      );
      setPublicTrustGalleryItems(
        normalizePublicTrustGalleryItems(data.publicTrustGalleryPhotos)
      );
    } catch {
      setMessage('Error de red');
    } finally {
      setLoading(false);
    }
  }

  async function save(overrides?: { galleryItems?: PublicTrustGalleryItem[]; videos?: string[] }) {
    const galleryItems = overrides?.galleryItems ?? publicTrustGalleryItems;
    const videos = overrides?.videos ?? publicPromoVideoUrls;
    setSaving(true);
    setMessage(null);
    try {
      const { fetchWithAuth } = await import('@/lib/fetch-with-auth');
      const res = await fetchWithAuth('/api/settings/seller-public-catalog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicPromoVideoUrls: videos,
          publicTrustGalleryPhotos: galleryItems,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage(err.error || 'Error al guardar');
        return false;
      }
      setPublicTrustGalleryItems(galleryItems);
      setPublicPromoVideoUrls(videos);
      setMessage('Fotos y videos guardados correctamente');
      return true;
    } catch {
      setMessage('Error al guardar');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function uploadPromoFile(file: File): Promise<string | null> {
    setUploading(true);
    try {
      const { fetchWithAuth } = await import('@/lib/fetch-with-auth');
      const form = new FormData();
      form.append('file', file);
      form.append('type', 'seller_public_promo');
      const res = await fetchWithAuth('/api/upload', { method: 'POST', body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage(err.error || 'Error al subir');
        return null;
      }
      const data = await res.json();
      return typeof data.url === 'string' ? data.url : null;
    } catch {
      setMessage('Error al subir');
      return null;
    } finally {
      setUploading(false);
    }
  }

  async function uploadGalleryFile(file: File): Promise<string | null> {
    setUploadingGallery(true);
    setGalleryUploadError(null);
    try {
      const { fetchWithAuth } = await import('@/lib/fetch-with-auth');
      const form = new FormData();
      form.append('file', file);
      form.append('type', 'seller_public_trust_gallery');
      const res = await fetchWithAuth('/api/upload', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error || data.details || 'Error al subir foto';
        setGalleryUploadError(msg);
        setMessage(msg);
        return null;
      }
      return typeof data.url === 'string' ? data.url : null;
    } catch {
      const msg = 'Error de conexión al subir foto';
      setGalleryUploadError(msg);
      setMessage(msg);
      return null;
    } finally {
      setUploadingGallery(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold">Tu página pública</h1>
        <p className="mt-2 text-gray-600">
          Fotos y videos que ven los clientes en tu perfil web antes del inventario.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.includes('correctamente')
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          {message}
        </div>
      )}

      <div id="fotos" className="rounded-lg border-2 border-primary-200 bg-white p-6 shadow-sm">
        <PublicTrustGallerySection
          items={publicTrustGalleryItems}
          onChange={setPublicTrustGalleryItems}
          onUploadFile={uploadGalleryFile}
          onUploadComplete={(galleryItems) => save({ galleryItems })}
          uploading={uploadingGallery}
          saving={saving}
          onSave={() => void save()}
          error={galleryUploadError}
        />
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <PromoVideosEditor
          urls={publicPromoVideoUrls}
          onChange={setPublicPromoVideoUrls}
          onUploadFile={uploadPromoFile}
          uploading={uploading}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || uploading || uploadingGallery}
          className="rounded-lg bg-primary-600 px-6 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar todo'}
        </button>
      </div>

      <p className="text-center text-sm">
        <Link href="/settings" className="text-primary-600 hover:underline">
          Volver a configuración
        </Link>
      </p>
    </div>
  );
}
