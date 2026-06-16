'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import BackButton from '@/components/BackButton';

export default function EditTenantPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'dealer' as 'dealer' | 'seller',
    companyName: '',
    subdomain: '',
    domain: '',
    status: 'active',
    membershipId: '',
    description: '',
    phone: '',
    ownerId: '',
    contactEmail: '',
    contactPhone: '',
    approvedByAdmin: false,
    branding: {
      primaryColor: '#E10600',
      secondaryColor: '#0A0A0A',
      logo: '',
      favicon: '',
    },
    settingsJson: '{}',
  });

  useEffect(() => {
    fetchTenant();
  }, [params.id]);

  async function fetchTenant() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/admin/tenants/${params.id}`);
      const data = await response.json();
      if (!response.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Error al cargar');
        return;
      }
      const t = data.tenant;
      setFormData({
        name: t.name || '',
        type: t.type === 'seller' ? 'seller' : 'dealer',
        companyName: t.companyName || '',
        subdomain: t.subdomain || '',
        domain: t.domain || '',
        status: t.status || 'active',
        membershipId: t.membershipId || '',
        description: t.description || '',
        phone: t.phone || '',
        ownerId: t.ownerId || '',
        contactEmail: (t.contactEmail as string) || '',
        contactPhone: (t.contactPhone as string) || '',
        approvedByAdmin: !!t.approvedByAdmin,
        branding: {
          primaryColor: t.branding?.primaryColor || '#E10600',
          secondaryColor: t.branding?.secondaryColor || '#0A0A0A',
          logo: (t.branding?.logo || t.branding?.logoUrl || '') as string,
          favicon: (t.branding?.favicon || t.branding?.faviconUrl || '') as string,
        },
        settingsJson: JSON.stringify(t.settings && typeof t.settings === 'object' ? t.settings : {}, null, 2),
      });
    } catch (e) {
      setError('Error de red al cargar el tenant');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    let settings: Record<string, unknown> = {};
    try {
      settings = JSON.parse(formData.settingsJson || '{}');
      if (typeof settings !== 'object' || settings === null || Array.isArray(settings)) {
        throw new Error('settings debe ser un objeto JSON');
      }
    } catch {
      setError('JSON de configuración (settings) inválido');
      setSaving(false);
      return;
    }

    const branding: Record<string, string> = {
      primaryColor: formData.branding.primaryColor,
      secondaryColor: formData.branding.secondaryColor,
    };
    if (formData.branding.logo.trim()) {
      branding.logo = formData.branding.logo.trim();
      branding.logoUrl = formData.branding.logo.trim();
    }
    if (formData.branding.favicon.trim()) {
      branding.favicon = formData.branding.favicon.trim();
      branding.faviconUrl = formData.branding.favicon.trim();
    }

    const body: Record<string, unknown> = {
      name: formData.name.trim(),
      companyName: formData.type === 'dealer' ? formData.companyName.trim() || null : null,
      subdomain: formData.subdomain.trim() || null,
      domain: formData.domain.trim() || null,
      status: formData.status,
      membershipId: formData.membershipId.trim(),
      description: formData.description.trim(),
      phone: formData.phone.trim() || null,
      ownerId: formData.ownerId.trim() || null,
      contactEmail: formData.contactEmail.trim() || null,
      contactPhone: formData.contactPhone.trim() || null,
      approvedByAdmin: formData.approvedByAdmin,
      branding,
      settings,
    };

    try {
      const response = await fetch(`/api/admin/tenants/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Error al actualizar tenant');
        return;
      }
      router.back();
    } catch {
      setError('Error de red al guardar');
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
        <BackButton label="Volver" />
      </div>
      <h1 className="text-3xl font-bold mb-2">Editar tenant</h1>
      <p className="text-sm text-gray-600 mb-6">
        Tipo de tenant: <strong className="capitalize">{formData.type}</strong> (no se puede cambiar aquí). Puedes
        corregir el <strong>ownerId</strong> (UID Firebase del titular) y el contacto público web.
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">Nombre público del tenant *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          {formData.type === 'dealer' && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Nombre de la compañía</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="Grupo o razón social"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Subdominio</label>
            <div className="flex items-center">
              <input
                type="text"
                value={formData.subdomain}
                onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
                className="flex-1 border rounded-l px-3 py-2"
                placeholder="mi-dealer"
              />
              <span className="border border-l-0 rounded-r px-3 py-2 bg-gray-50 text-sm">.autodealers.com</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Dominio personalizado (opcional)</label>
            <input
              type="text"
              value={formData.domain}
              onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="www.miconcesionario.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Teléfono del tenant</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">ownerId (UID del titular en Firebase)</label>
            <input
              type="text"
              value={formData.ownerId}
              onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
              className="w-full border rounded px-3 py-2 font-mono text-sm"
              placeholder="UID del usuario dueño del espacio"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email de contacto público (web)</label>
            <input
              type="email"
              value={formData.contactEmail}
              onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Teléfono de contacto público (web / WhatsApp)</label>
            <input
              type="tel"
              value={formData.contactPhone}
              onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">ID membresía (Stripe / interno)</label>
            <input
              type="text"
              value={formData.membershipId}
              onChange={(e) => setFormData({ ...formData, membershipId: e.target.value })}
              className="w-full border rounded px-3 py-2 font-mono text-sm"
              placeholder="Opcional"
            />
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
              <option value="cancelled">Cancelado</option>
              <option value="pending">Pendiente</option>
            </select>
          </div>

          <div className="md:col-span-2 flex items-center gap-2">
            <input
              id="approvedByAdmin"
              type="checkbox"
              checked={formData.approvedByAdmin}
              onChange={(e) => setFormData({ ...formData, approvedByAdmin: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="approvedByAdmin" className="text-sm">
              Aprobado por administración
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Descripción (web pública / footer)</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full border rounded px-3 py-2"
            rows={4}
            maxLength={2000}
          />
        </div>

        <div className="border-t pt-4">
          <h2 className="text-lg font-semibold mb-4">Marca (branding)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">URL logo (imagen)</label>
              <input
                type="url"
                value={formData.branding.logo}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    branding: { ...formData.branding, logo: e.target.value },
                  })
                }
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">URL favicon</label>
              <input
                type="url"
                value={formData.branding.favicon}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    branding: { ...formData.branding, favicon: e.target.value },
                  })
                }
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="https://... (PNG, ICO o SVG recomendado)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Color primario</label>
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
              <label className="block text-sm font-medium mb-2">Color secundario</label>
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
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Settings (JSON avanzado)</label>
          <textarea
            value={formData.settingsJson}
            onChange={(e) => setFormData({ ...formData, settingsJson: e.target.value })}
            className="w-full border rounded px-3 py-2 font-mono text-xs min-h-[120px]"
          />
          <p className="text-xs text-gray-500 mt-1">Objeto JSON. Cuidado: valores inválidos pueden afectar el panel del cliente.</p>
        </div>

        <div className="flex gap-2 justify-end pt-4 border-t">
          <button type="button" onClick={() => router.back()} className="px-4 py-2 border rounded">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}
