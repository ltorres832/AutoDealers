'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function BrandingSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [faviconPreview, setFaviconPreview] = useState<string>('');
  const [currentLogo, setCurrentLogo] = useState<string>('');
  const [currentFavicon, setCurrentFavicon] = useState<string>('');
  const [subdomain, setSubdomain] = useState<string>('');
  const [canUseSubdomain, setCanUseSubdomain] = useState(false);

  useEffect(() => {
    fetchCurrentBranding();
  }, []);

  async function fetchCurrentBranding() {
    try {
      const [brandingRes, membershipRes] = await Promise.all([
        fetch('/api/settings/branding'),
        fetch('/api/settings/membership'),
      ]);
      
      if (brandingRes.ok) {
        const data = await brandingRes.json();
        if (data.logo) setCurrentLogo(data.logo);
        if (data.favicon) setCurrentFavicon(data.favicon);
        setLogoPreview(data.logo || '');
        setFaviconPreview(data.favicon || '');
        if (data.subdomain) setSubdomain(data.subdomain);
      }

      if (membershipRes.ok) {
        const membershipData = await membershipRes.json();
        setCanUseSubdomain(membershipData.membership?.features?.customSubdomain || false);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona un archivo de imagen');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('El logo no puede ser mayor a 5MB');
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  function handleFaviconChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona un archivo de imagen');
        return;
      }
      if (file.size > 1 * 1024 * 1024) {
        alert('El favicon no puede ser mayor a 1MB');
        return;
      }
      setFaviconFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFaviconPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      if (logoFile) {
        formData.append('logo', logoFile);
      }
      if (faviconFile) {
        formData.append('favicon', faviconFile);
      }

      const response = await fetch('/api/settings/branding', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error al actualizar branding');
      }

      const data = await response.json();
      alert('Branding actualizado exitosamente');
      
      if (data.favicon) {
        updateFavicon(data.favicon);
      }
      
      window.location.reload();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar branding');
    } finally {
      setLoading(false);
    }
  }

  function updateFavicon(url: string) {
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (link) {
      link.href = url;
    } else {
      const newLink = document.createElement('link');
      newLink.rel = 'icon';
      newLink.href = url;
      document.getElementsByTagName('head')[0].appendChild(newLink);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Configuración</h1>
        <p className="text-gray-600">
          Personaliza tu dashboard y página web pública
        </p>

        {/* Settings Tabs */}
        <div className="mt-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <Link
              href="/settings/branding"
              className="border-b-2 border-primary-500 py-4 px-1 text-sm font-medium text-primary-600"
            >
              Branding
            </Link>
            <Link
              href="/settings/profile"
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Perfil
            </Link>
            <Link
              href="/settings/integrations"
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Integraciones
            </Link>
            <Link
              href="/settings/membership"
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Membresía
            </Link>
          </nav>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Logo</h2>
          <div className="flex items-start space-x-6">
            <div className="flex-shrink-0">
              <div className="h-32 w-48 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo preview" className="max-h-full max-w-full object-contain" />
                ) : (
                  <div className="text-center text-gray-400">
                    <svg className="mx-auto h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm">Sin logo</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Subir nuevo logo</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              />
              <p className="mt-2 text-xs text-gray-500">Formatos: PNG, JPG, SVG. Tamaño máximo: 5MB. Recomendado: 200x60px</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Favicon</h2>
          <div className="flex items-start space-x-6">
            <div className="flex-shrink-0">
              <div className="h-16 w-16 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                {faviconPreview ? (
                  <img src={faviconPreview} alt="Favicon preview" className="h-full w-full object-contain" />
                ) : (
                  <div className="text-center text-gray-400">
                    <svg className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Subir nuevo favicon</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFaviconChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              />
              <p className="mt-2 text-xs text-gray-500">Formatos: PNG, ICO, SVG. Tamaño máximo: 1MB. Recomendado: 32x32px o 64x64px</p>
            </div>
          </div>
        </div>

        {/* Subdominio */}
        {canUseSubdomain && (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-bold mb-4">Subdominio Personalizado</h2>
            <div>
              <label className="block text-sm font-medium mb-2">Subdominio</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="flex-1 border rounded px-3 py-2"
                  placeholder="mivendedor"
                  pattern="[a-z0-9-]+"
                />
                <span className="text-gray-600">.autodealers.com</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Tu sitio web estará disponible en: https://{subdomain || 'subdomain'}.autodealers.com
              </p>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const response = await fetch('/api/settings/branding/subdomain', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ subdomain }),
                    });
                    if (response.ok) {
                      alert('Subdominio actualizado exitosamente');
                    } else {
                      const error = await response.json();
                      alert(error.error || 'Error al actualizar subdominio');
                    }
                  } catch (error) {
                    alert('Error al actualizar subdominio');
                  }
                }}
                className="mt-2 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 text-sm"
              >
                Guardar Subdominio
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => {
              setLogoFile(null);
              setFaviconFile(null);
              setLogoPreview(currentLogo);
              setFaviconPreview(currentFavicon);
            }}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || (!logoFile && !faviconFile)}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}



