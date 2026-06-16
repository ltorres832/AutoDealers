'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getApps } from 'firebase/app';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import {
  parsePlatformBrandingFirestoreData,
  PLATFORM_BRANDING_COLLECTION,
  PLATFORM_BRANDING_DOC_ID,
} from '@autodealers/shared/platform-branding-client';

export default function BrandingSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    logo: '',
    favicon: '',
    companyName: 'AutoDealers',
    adminName: 'Administrador',
    adminPhoto: '',
  });

  const savingRef = useRef(false);
  const uploadingRef = useRef(false);

  useEffect(() => {
    savingRef.current = saving;
  }, [saving]);

  useEffect(() => {
    uploadingRef.current = uploading;
  }, [uploading]);

  useEffect(() => {
    void fetchBranding();
  }, []);

  async function fetchBranding() {
    try {
      const response = await fetch('/api/admin/settings/branding', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (response.ok) {
        const data = await response.json();
        setFormData({
          logo: data.logo || '',
          favicon: data.favicon || '',
          companyName: data.companyName || 'AutoDealers',
          adminName: data.adminName || 'Administrador',
          adminPhoto: data.adminPhoto || '',
        });
      }
    } catch (error) {
      console.error('Error fetching branding:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let unsub: (() => void) | undefined;
    if (typeof window !== 'undefined' && getApps().length > 0) {
      try {
        const ref = doc(db, PLATFORM_BRANDING_COLLECTION, PLATFORM_BRANDING_DOC_ID);
        unsub = onSnapshot(ref, (snap) => {
          if (uploadingRef.current || savingRef.current) return;
          if (!snap.exists()) {
            void fetchBranding();
            return;
          }
          const d = snap.data() as Record<string, unknown> | undefined;
          const p = parsePlatformBrandingFirestoreData(d, d?.updatedAt);
          setFormData({
            logo: p.logo,
            favicon: p.favicon,
            companyName: p.companyName,
            adminName: p.adminName,
            adminPhoto: p.adminPhoto,
          });
          setLoading(false);
        });
      } catch {
        /* ignorar */
      }
    }
    return () => unsub?.();
  }, []);

  async function uploadErrorMessage(response: Response): Promise<string> {
    try {
      const data = await response.json();
      const msg =
        (typeof data?.error === 'string' && data.error.trim()) ||
        (typeof data?.details === 'string' && data.details.trim()) ||
        '';
      return msg || `Error al subir (${response.status})`;
    } catch {
      return `Error al subir (${response.status})`;
    }
  }

  async function handleFileUpload(file: File): Promise<string> {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'branding');

      const response = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await uploadErrorMessage(response));
      }

      const data = await response.json();
      const url = data?.url;
      if (typeof url !== 'string' || !url.trim()) {
        throw new Error('El servidor no devolvió una URL válida para el archivo.');
      }
      return url.trim();
    } finally {
      setUploading(false);
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('El logo no debe superar 5MB');
        return;
      }
      try {
        const url = await handleFileUpload(file);
        setFormData((prev) => ({ ...prev, logo: url }));
      } catch (err) {
        console.error(err);
        alert(err instanceof Error ? err.message : 'No se pudo subir el logo.');
      }
    }
    e.target.value = '';
  }

  async function handleFaviconChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert('El icono no debe superar 1MB. Usa PNG o ICO cuadrado (p. ej. 32×32 o 192×192).');
        return;
      }
      try {
        const url = await handleFileUpload(file);
        setFormData((prev) => ({ ...prev, favicon: url }));
      } catch (err) {
        console.error(err);
        alert(err instanceof Error ? err.message : 'No se pudo subir el icono.');
      }
    }
    e.target.value = '';
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const url = await handleFileUpload(file);
        setFormData((prev) => ({ ...prev, adminPhoto: url }));
      } catch (err) {
        console.error(err);
        alert(err instanceof Error ? err.message : 'No se pudo subir la foto.');
      }
    }
    e.target.value = '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings/branding', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert('Configuración de marca guardada exitosamente');
        window.dispatchEvent(new Event('autodealers-branding-updated'));
        router.refresh();
      } else {
        let message = `No se pudo guardar (${response.status}).`;
        try {
          const error = await response.json();
          const part =
            (typeof error?.error === 'string' && error.error.trim()) ||
            (typeof error?.details === 'string' && error.details.trim()) ||
            '';
          if (part) message = part;
        } catch {
          /* mantener message por defecto */
        }
        alert(message);
      }
    } catch (error) {
      console.error('Error:', error);
      alert(
        error instanceof Error && error.message
          ? error.message
          : 'Error al guardar configuración'
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Configuración de Marca</h1>
      <p className="mb-6 text-sm text-gray-600">
        Sube el <strong>logo</strong> (barra lateral y cabecera) y el <strong>icono</strong> (favicon de la pestaña).
        Los cambios guardados se reflejan en el panel y en la web pública en <strong>tiempo real</strong> (Firestore).
        Tras guardar, si alguna pestaña no actualiza el favicon al instante, prueba recargar con Ctrl+F5 (caché del
        navegador).
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo de la Empresa */}
        <div className="bg-white p-6 rounded-lg shadow">
          <label className="block text-sm font-medium mb-2">Logo del panel (imagen ancha)</label>
          <p className="mb-2 text-xs text-gray-500">PNG o SVG recomendado; se muestra en el menú lateral.</p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {formData.logo && (
              <img src={formData.logo} alt="Logo" className="h-20 w-auto max-w-full object-contain" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              disabled={uploading}
              className="flex-1 text-sm"
            />
          </div>
        </div>

        {/* Favicon / icono de pestaña */}
        <div className="bg-white p-6 rounded-lg shadow">
          <label className="block text-sm font-medium mb-2">Icono del sitio (favicon)</label>
          <p className="mb-2 text-xs text-gray-500">
            Cuadrado: ICO, PNG o JPG (p. ej. 32×32 o 192×192). También se usa como icono Apple al guardar en el
            navegador.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {formData.favicon && (
              <img src={formData.favicon} alt="Favicon" className="h-16 w-16 rounded border object-contain" />
            )}
            <input
              type="file"
              accept="image/*,.ico"
              onChange={handleFaviconChange}
              disabled={uploading}
              className="flex-1 text-sm"
            />
          </div>
        </div>

        {/* Nombre de la Empresa */}
        <div className="bg-white p-6 rounded-lg shadow">
          <label className="block text-sm font-medium mb-2">Nombre de la Empresa</label>
          <input
            type="text"
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="AutoDealers"
          />
        </div>

        {/* Foto del Administrador */}
        <div className="bg-white p-6 rounded-lg shadow">
          <label className="block text-sm font-medium mb-2">Foto del Administrador</label>
          <div className="flex items-center gap-4">
            {formData.adminPhoto && (
              <img
                src={formData.adminPhoto}
                alt="Admin Photo"
                className="h-20 w-20 rounded-full object-cover"
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              disabled={uploading}
              className="flex-1"
            />
          </div>
        </div>

        {/* Nombre del Administrador */}
        <div className="bg-white p-6 rounded-lg shadow">
          <label className="block text-sm font-medium mb-2">Nombre del Administrador</label>
          <input
            type="text"
            value={formData.adminName}
            onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="Administrador"
          />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving || uploading}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
