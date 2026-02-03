'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import BackButton from '@/components/BackButton';

export default function EditTenantPage() {
  const params = useParams();
  const router = useRouter();
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subdomain: '',
    status: 'active',
    branding: {
      primaryColor: '#2563EB',
      secondaryColor: '#1E40AF',
    },
  });

  useEffect(() => {
    fetchTenant();
  }, [params.id]);

  async function fetchTenant() {
    try {
      const response = await fetch(`/api/admin/tenants/${params.id}`);
      const data = await response.json();
      setTenant(data.tenant);
      setFormData({
        name: data.tenant.name,
        description: data.tenant.description || '',
        subdomain: data.tenant.subdomain || '',
        status: data.tenant.status,
        branding: data.tenant.branding || {
          primaryColor: '#2563EB',
          secondaryColor: '#1E40AF',
        },
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/admin/tenants/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push(`/admin/tenants/${params.id}`);
      } else {
        alert('Error al actualizar tenant');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar tenant');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <BackButton href="/admin/tenants" label="Volver a Tenants" />
      </div>
      <h1 className="text-3xl font-bold mb-6">Editar Tenant</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Nombre del Tenant *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full border rounded px-3 py-2"
            placeholder="Ej: AutoDealers Premium"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Este nombre aparecerá en el header y footer de la página web pública
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Descripción</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full border rounded px-3 py-2"
            rows={4}
            placeholder="Ej: Tu concesionario de confianza con más de 10 años de experiencia..."
            maxLength={500}
          />
          <p className="text-xs text-gray-500 mt-1">
            {formData.description.length}/500 caracteres. Esta descripción aparecerá en el footer de la página web pública.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Subdominio</label>
          <div className="flex items-center">
            <input
              type="text"
              value={formData.subdomain}
              onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
              className="flex-1 border rounded-l px-3 py-2"
            />
            <span className="border border-l-0 rounded-r px-3 py-2 bg-gray-50">
              .autodealers.com
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Estado</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full border rounded px-3 py-2"
          >
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
            <option value="suspended">Suspendido</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Color Primario</label>
          <input
            type="color"
            value={formData.branding.primaryColor}
            onChange={(e) =>
              setFormData({
                ...formData,
                branding: { ...formData.branding, primaryColor: e.target.value },
              })
            }
            className="w-full h-12 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Color Secundario</label>
          <input
            type="color"
            value={formData.branding.secondaryColor}
            onChange={(e) =>
              setFormData({
                ...formData,
                branding: { ...formData.branding, secondaryColor: e.target.value },
              })
            }
            className="w-full h-12 border rounded"
          />
        </div>

        <div className="flex gap-2 justify-end pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border rounded"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}




