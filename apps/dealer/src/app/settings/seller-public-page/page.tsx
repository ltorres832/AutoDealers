'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function SellerPublicPageSettings() {
  const [publicPromoVideoUrl, setPublicPromoVideoUrl] = useState('');
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
      setPublicPromoVideoUrl(data.publicPromoVideoUrl || '');
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
        body: JSON.stringify({ publicPromoVideoUrl }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage(err.error || 'Error al guardar');
        return;
      }
      setMessage('Guardado correctamente');
    } catch {
      setMessage('Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function onUploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setMessage('Selecciona un archivo de video');
      return;
    }
    setUploading(true);
    setMessage(null);
    try {
      const { fetchWithAuth } = await import('@/lib/fetch-with-auth');
      const form = new FormData();
      form.append('file', file);
      form.append('type', 'seller_public_promo');
      const res = await fetchWithAuth('/api/upload', { method: 'POST', body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage(err.error || 'Error al subir el video');
        return;
      }
      const data = await res.json();
      if (data.url) {
        setPublicPromoVideoUrl(data.url);
        const put = await fetchWithAuth('/api/settings/seller-public-catalog', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicPromoVideoUrl: data.url }),
        });
        if (!put.ok) {
          setMessage('El archivo se subió pero no se pudo guardar la URL. Pulsa Guardar.');
          return;
        }
        setMessage('Video subido y guardado');
      }
    } catch {
      setMessage('Error al subir');
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
        <h1 className="text-2xl font-bold text-gray-900">Tu video en la web pública</h1>
        <p className="mt-2 text-gray-600">
          Este video aparece en tu página de vendedor, antes de tus vehículos. Puedes pegar un enlace (YouTube,
          Vimeo o un .mp4 en HTTPS) o subir un archivo de video.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.includes('correctamente') || message.includes('subido')
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          {message}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 font-semibold text-gray-900">Enlace público de tu página</h2>
        <p className="mb-3 text-sm text-gray-600">
          En el sitio web del concesionario, tu catálogo está en la ruta{' '}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{publicPath}</code>
          {tenantSubdomain ? (
            <>
              {' '}
              (subdominio del dealer: <span className="font-mono text-xs">{tenantSubdomain}</span>)
            </>
          ) : null}
        </p>
        <p className="text-xs text-gray-500">
          La URL exacta depende del dominio que use tu concesionario; copia la ruta desde el navegador cuando
          abras tu página de vendedor.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">URL del video</label>
          <input
            type="url"
            value={publicPromoVideoUrl}
            onChange={(e) => setPublicPromoVideoUrl(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="https://www.youtube.com/watch?v=… o https://…/video.mp4"
          />
          <p className="mt-1 text-xs text-gray-500">
            YouTube, Vimeo o enlace HTTPS directo a .mp4 / .webm. Deja vacío para quitar el video.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => save()}
            disabled={saving}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar enlace'}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-3">
        <h2 className="font-semibold text-gray-900">Subir video desde tu equipo</h2>
        <p className="text-sm text-gray-600">
          Se guarda en tu cuenta (almacenamiento del concesionario). Tamaño máximo 100 MB. Formatos habituales:
          MP4, WebM.
        </p>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium hover:bg-gray-100">
          <input type="file" accept="video/*" className="hidden" disabled={uploading} onChange={onUploadFile} />
          {uploading ? 'Subiendo…' : 'Elegir archivo de video'}
        </label>
      </div>

      <p className="text-center text-sm text-gray-500">
        <Link href="/login" className="text-primary-600 hover:underline">
          Cerrar sesión
        </Link>
        {' · '}
        ¿Problemas? Contacta a tu concesionario.
      </p>
    </div>
  );
}
