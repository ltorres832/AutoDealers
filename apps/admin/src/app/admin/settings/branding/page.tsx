'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BrandingSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    logo: '',
    companyName: 'AutoDealers',
    adminName: 'Administrador',
    adminPhoto: '',
  });

  useEffect(() => {
    fetchBranding();
  }, []);

  async function fetchBranding() {
    try {
      const response = await fetch('/api/admin/settings/branding');
      if (response.ok) {
        const data = await response.json();
        setFormData({
          logo: data.logo || '',
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

  async function handleFileUpload(file: File, type: 'logo' | 'adminPhoto'): Promise<string> {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'branding');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error al subir archivo');
      }

      const data = await response.json();
      return data.url;
    } finally {
      setUploading(false);
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const url = await handleFileUpload(file, 'logo');
      setFormData({ ...formData, logo: url });
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const url = await handleFileUpload(file, 'adminPhoto');
      setFormData({ ...formData, adminPhoto: url });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert('Configuración de marca guardada exitosamente');
        router.refresh();
      } else {
        const error = await response.json();
        alert('Error: ' + (error.error || 'Error al guardar'));
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar configuración');
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo de la Empresa */}
        <div className="bg-white p-6 rounded-lg shadow">
          <label className="block text-sm font-medium mb-2">Logo de la Empresa</label>
          <div className="flex items-center gap-4">
            {formData.logo && (
              <img src={formData.logo} alt="Logo" className="h-20 w-auto object-contain" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              disabled={uploading}
              className="flex-1"
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
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
