'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PublicTrustGallerySection } from '@/components/PublicTrustGallerySection';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import {
  normalizePublicTrustGalleryItems,
  type PublicTrustGalleryItem,
} from '@autodealers/shared/public-trust-gallery';

export default function DealerTrustGallerySettingsPage() {
  const [publicTrustGalleryItems, setPublicTrustGalleryItems] = useState<PublicTrustGalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [galleryUploadError, setGalleryUploadError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetchWithAuth('/api/settings/public-trust-gallery');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage(err.error || 'No se pudo cargar');
        return;
      }
      const data = await res.json();
      setPublicTrustGalleryItems(
        normalizePublicTrustGalleryItems(data.publicTrustGalleryPhotos)
      );
    } catch {
      setMessage('Error de red');
    } finally {
      setLoading(false);
    }
  }

  async function save(items = publicTrustGalleryItems) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetchWithAuth('/api/settings/public-trust-gallery', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicTrustGalleryPhotos: items }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage(err.error || 'Error al guardar');
        return false;
      }
      setPublicTrustGalleryItems(items);
      setMessage('Galería guardada correctamente');
      return true;
    } catch {
      setMessage('Error al guardar');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function uploadGalleryFile(file: File): Promise<string | null> {
    setUploading(true);
    setGalleryUploadError(null);
    try {
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
      setUploading(false);
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
        <h1 className="text-2xl font-bold">Fotos de tu página pública</h1>
        <p className="mt-2 text-gray-600">
          Galería de confianza: entregas, clientes satisfechos, eventos o tu equipo. Se muestran en tu catálogo web.
        </p>
      </div>

      {message ? (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.includes('correctamente')
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          {message}
        </div>
      ) : null}

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <PublicTrustGallerySection
          items={publicTrustGalleryItems}
          onChange={setPublicTrustGalleryItems}
          onUploadFile={uploadGalleryFile}
          onUploadComplete={(items) => save(items)}
          uploading={uploading}
          saving={saving}
          onSave={() => void save()}
          error={galleryUploadError}
        />
      </div>

      <p className="text-center text-sm">
        <Link href="/settings" className="text-primary-600 hover:underline">
          Volver a configuración
        </Link>
      </p>
    </div>
  );
}
