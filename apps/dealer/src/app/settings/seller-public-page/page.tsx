'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PromoVideosEditor } from '@autodealers/shared/components/PromoVideosEditor';

export default function DealerSellerPublicPageSettings() {
  const [publicPromoVideoUrls, setPublicPromoVideoUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
    } catch {
      setMessage('Error de red');
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const { fetchWithAuth } = await import('@/lib/fetch-with-auth');
      const res = await fetchWithAuth('/api/settings/seller-public-catalog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicPromoVideoUrls }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage(err.error || 'Error al guardar');
        return;
      }
      setMessage('Videos guardados correctamente');
    } catch {
      setMessage('Error al guardar');
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
        <h1 className="text-2xl font-bold">Videos en tu página pública (vendedor)</h1>
        <p className="mt-2 text-gray-600">
          Se muestran en la web en filas de dos, antes del inventario.
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

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <PromoVideosEditor
          urls={publicPromoVideoUrls}
          onChange={setPublicPromoVideoUrls}
          onUploadFile={uploadPromoFile}
          uploading={uploading}
          saving={saving}
          onSave={save}
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
