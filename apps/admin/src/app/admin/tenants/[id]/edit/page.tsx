'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import BackButton from '@/components/BackButton';
import { tenantHostSuffix } from '@autodealers/shared/platform-urls';
import { WebsiteHeroMediaEditor } from '@autodealers/shared/components/WebsiteHeroMediaEditor';
import {
  normalizeWebsiteHeroMedia,
  type WebsiteHeroMediaMode,
} from '@autodealers/shared/website-hero-media';

const DEFAULT_HERO_TITLE = 'Encuentra el vehículo perfecto para ti';
const DEFAULT_HERO_SUBTITLE = 'Tenemos la mejor selección de vehículos';
const DEFAULT_HERO_CTA = 'Ver Inventario';

type HeroForm = {
  title: string;
  subtitle: string;
  ctaText: string;
  mediaMode: WebsiteHeroMediaMode;
  backgroundImage?: string;
  backgroundVideoUrl?: string;
  showText?: boolean;
};

export default function EditTenantPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = String(params.id || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
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
    hero: {
      title: DEFAULT_HERO_TITLE,
      subtitle: DEFAULT_HERO_SUBTITLE,
      ctaText: DEFAULT_HERO_CTA,
      mediaMode: 'gradient' as WebsiteHeroMediaMode,
    } satisfies HeroForm,
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
      const wsHero =
        t.websiteSettings?.hero && typeof t.websiteSettings.hero === 'object'
          ? t.websiteSettings.hero
          : {};
      const media = normalizeWebsiteHeroMedia(wsHero);
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
        hero: {
          title:
            typeof wsHero.title === 'string' && wsHero.title.trim()
              ? wsHero.title.trim()
              : DEFAULT_HERO_TITLE,
          subtitle:
            typeof wsHero.subtitle === 'string' && wsHero.subtitle.trim()
              ? wsHero.subtitle.trim()
              : DEFAULT_HERO_SUBTITLE,
          ctaText:
            typeof wsHero.ctaText === 'string' && wsHero.ctaText.trim()
              ? wsHero.ctaText.trim()
              : DEFAULT_HERO_CTA,
          mediaMode: media.mediaMode,
          backgroundImage: media.backgroundImage,
          backgroundVideoUrl: media.backgroundVideoUrl,
          showText: media.showText,
        },
        settingsJson: JSON.stringify(
          t.settings && typeof t.settings === 'object' ? t.settings : {},
          null,
          2
        ),
      });
    } catch (e) {
      setError('Error de red al cargar el tenant');
    } finally {
      setLoading(false);
    }
  }

  async function uploadWebsiteHeroFile(
    file: File,
    type: 'website_hero_image' | 'website_hero_video'
  ): Promise<string | null> {
    setMediaUploading(true);
    try {
      const { fetchWithAuth } = await import('@/lib/fetch-with-auth');
      const form = new FormData();
      form.append('file', file);
      form.append('type', type);
      form.append('tenantId', tenantId);
      const res = await fetchWithAuth('/api/upload', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Error al subir el archivo');
        return null;
      }
      return typeof data.url === 'string' ? data.url : null;
    } catch {
      setError('Error de red al subir el archivo');
      return null;
    } finally {
      setMediaUploading(false);
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

    const heroPayload: Record<string, unknown> = {
      title: formData.hero.title.trim() || DEFAULT_HERO_TITLE,
      subtitle: formData.hero.subtitle.trim() || DEFAULT_HERO_SUBTITLE,
      ctaText: formData.hero.ctaText.trim() || DEFAULT_HERO_CTA,
      mediaMode: formData.hero.mediaMode || 'gradient',
      backgroundImage: formData.hero.backgroundImage?.trim() || '',
      backgroundVideoUrl: formData.hero.backgroundVideoUrl?.trim() || '',
    };

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
      websiteSettings: {
        hero: heroPayload,
      },
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
        corregir el <strong>ownerId</strong> (UID Firebase del titular), el contacto público web y el fondo del
        hero de su página pública.
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
              <span className="border border-l-0 rounded-r px-3 py-2 bg-gray-50 text-sm">{tenantHostSuffix()}</span>
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

        <div className="border-t pt-4">
          <h2 className="text-lg font-semibold mb-1">Hero de la página pública</h2>
          <p className="text-sm text-gray-600 mb-4">
            Aplica al catálogo/mini-sitio de este{' '}
            {formData.type === 'dealer' ? 'dealer' : 'vendedor'}: gradiente por defecto, foto o video
            (subida o link).
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Título</label>
              <input
                type="text"
                value={formData.hero.title}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    hero: { ...formData.hero, title: e.target.value },
                  })
                }
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Subtítulo</label>
              <input
                type="text"
                value={formData.hero.subtitle}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    hero: { ...formData.hero, subtitle: e.target.value },
                  })
                }
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Texto del botón CTA</label>
              <input
                type="text"
                value={formData.hero.ctaText}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    hero: { ...formData.hero, ctaText: e.target.value },
                  })
                }
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <WebsiteHeroMediaEditor
              mediaMode={formData.hero.mediaMode || 'gradient'}
              backgroundImage={formData.hero.backgroundImage}
              backgroundVideoUrl={formData.hero.backgroundVideoUrl}
              showText={formData.hero.showText}
              uploading={mediaUploading}
              disabled={saving}
              onChange={(next) =>
                setFormData({
                  ...formData,
                  hero: {
                    ...formData.hero,
                    mediaMode: next.mediaMode,
                    backgroundImage: next.backgroundImage,
                    backgroundVideoUrl: next.backgroundVideoUrl,
                    showText: next.showText,
                  },
                })
              }
              onUploadImage={(file) => uploadWebsiteHeroFile(file, 'website_hero_image')}
              onUploadVideo={(file) => uploadWebsiteHeroFile(file, 'website_hero_video')}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Settings (JSON avanzado)</label>
          <textarea
            value={formData.settingsJson}
            onChange={(e) => setFormData({ ...formData, settingsJson: e.target.value })}
            className="w-full border rounded px-3 py-2 font-mono text-xs min-h-[120px]"
          />
          <p className="text-xs text-gray-500 mt-1">
            Objeto JSON. Cuidado: valores inválidos pueden afectar el panel del cliente.
          </p>
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
