'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PromoVideosEditor } from '@autodealers/shared/components/PromoVideosEditor';

export default function SellerPublicPageSettings() {
  const [publicPromoVideoUrls, setPublicPromoVideoUrls] = useState<string[]>([]);
  const [sellerId, setSellerId] = useState('');
  const [tenantSubdomain, setTenantSubdomain] = useState('');
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
        setMessage(err.error || 'No se pudo cargar la configuración');
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
      setSellerId(data.sellerId || '');
      setTenantSubdomain(data.tenantSubdomain || '');
    } catch {
      setMessage('Error de red al cargar');
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
        setMessage(err.error || 'Error al subir el video');
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

  const publicPath = sellerId ? `/seller/${sellerId}` : '/seller/…';

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tus videos en la web pública</h1>
        <p className="mt-2 text-gray-600">
          Los visitantes verán tus videos en filas de dos, uno al lado del otro, antes de tu inventario.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.includes('correctamente') || message.includes('guardad')
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          {message}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 font-semibold text-gray-900">Enlace público de tu catálogo</h2>
        <p className="mb-3 text-sm text-gray-600">
          Ruta en la web pública:{' '}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{publicPath}</code>
          {tenantSubdomain ? (
            <>
              {' '}
              (subdominio: <span className="font-mono text-xs">{tenantSubdomain}</span>)
            </>
          ) : null}
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <PromoVideosEditor
          urls={publicPromoVideoUrls}
          onChange={setPublicPromoVideoUrls}
          onUploadFile={uploadPromoFile}
          uploading={uploading}
          saving={saving}
          onSave={save}
        />
      </div>

      <p className="text-center text-sm text-gray-500">
        <Link href="/settings" className="text-primary-600 hover:underline">
          Volver a configuración
        </Link>
      </p>
    </div>
  );
}
