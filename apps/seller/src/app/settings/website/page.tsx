'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  createDefaultWebsiteSettingsRecord,
  normalizeWebsiteSettingsFromFirestore,
} from '@/lib/website-settings-normalize';
import { SocialMediaLinks } from '@autodealers/shared/client';
import { resolvePrimaryPublicSiteUrl } from '@/lib/public-site-url';

interface WebsiteSettings {
  hero: {
    title: string;
    subtitle: string;
    ctaText: string;
    backgroundImage?: string;
  };
  sections: {
    about: {
      enabled: boolean;
      title: string;
      content: string;
    };
    services: {
      enabled: boolean;
      title: string;
      items?: Array<{ name: string; description: string; icon?: string }>;
    };
    testimonials: {
      enabled: boolean;
      title: string;
    };
    contact: {
      enabled: boolean;
      title: string;
      showMap: boolean;
    };
  };
  layout: {
    headerStyle: 'default' | 'minimal' | 'modern';
    footerStyle: 'default' | 'minimal';
    colorScheme: 'light' | 'dark' | 'auto';
  };
  seo: {
    metaTitle: string;
    metaDescription: string;
    keywords: string;
  };
  /** Widget de chat en la página pública (subdominio). */
  chat?: {
    enabled: boolean;
    welcomeMessage?: string;
  };
}

function createDefaultWebsiteSettings(): WebsiteSettings {
  return normalizeWebsiteSettingsFromFirestore(
    createDefaultWebsiteSettingsRecord()
  ) as unknown as WebsiteSettings;
}

function recordToWebsiteSettings(raw: Record<string, unknown>): WebsiteSettings {
  return normalizeWebsiteSettingsFromFirestore(raw) as unknown as WebsiteSettings;
}

export default function WebsiteSettingsPage() {
  const [settings, setSettings] = useState<WebsiteSettings>(() => createDefaultWebsiteSettings());
  const [subdomain, setSubdomain] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [branding, setBranding] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [publicCatalogUrl, setPublicCatalogUrl] = useState('');
  const [publicSubdomainUrl, setPublicSubdomainUrl] = useState<string | null>(null);
  const [primaryPublicSiteUrl, setPrimaryPublicSiteUrl] = useState('');
  const [isIndependentWorkspace, setIsIndependentWorkspace] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    try {
      const [websiteRes, brandingRes, profileRes] = await Promise.all([
        fetch('/api/settings/website'),
        fetch('/api/settings/branding'),
        fetch('/api/settings/profile'),
      ]);

      if (websiteRes.ok) {
        const data = await websiteRes.json();
        if (data.settings && typeof data.settings === 'object') {
          setSettings(recordToWebsiteSettings(data.settings as Record<string, unknown>));
        }
        if (typeof data.publicCatalogUrl === 'string') setPublicCatalogUrl(data.publicCatalogUrl);
        if (typeof data.publicSubdomainUrl === 'string') setPublicSubdomainUrl(data.publicSubdomainUrl);
        if (typeof data.primaryPublicSiteUrl === 'string') {
          setPrimaryPublicSiteUrl(data.primaryPublicSiteUrl);
        }
        setIsIndependentWorkspace(Boolean(data.isIndependentSellerWorkspace));
      }

      if (brandingRes.ok) {
        const brandingData = await brandingRes.json();
        setSubdomain(brandingData.subdomain || '');
        setBranding(brandingData);
      }

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData.profile);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const response = await fetch('/api/settings/website', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data.settings && typeof data.settings === 'object') {
          setSettings(recordToWebsiteSettings(data.settings as Record<string, unknown>));
        }
        alert('Configuración de la página web guardada exitosamente');
      } else {
        const err = await response.json().catch(() => ({}));
        console.error('website save error', err);
        alert(err?.details || err?.error || 'Error al guardar la configuración');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar la configuración');
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

  const primaryPublicUrl =
    primaryPublicSiteUrl ||
    publicCatalogUrl ||
    resolvePrimaryPublicSiteUrl({
      sellerId: profile?.userId,
      publicCatalogUrl,
    });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Configuración</h1>
            <p className="text-gray-600">
              Personaliza tu página web pública que verán tus clientes
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium border border-gray-300"
            >
              {showPreview ? '✏️ Editar' : '👁️ Vista Previa'}
            </button>
            {primaryPublicUrl && (
              <a
                href={primaryPublicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
              >
                🔗 Abrir mi catálogo público
              </a>
            )}
          </div>
        </div>

        {/* Settings Tabs */}
        <div className="mt-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <Link
              href="/settings/branding"
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
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
              href="/settings/website"
              className="border-b-2 border-primary-500 py-4 px-1 text-sm font-medium text-primary-600"
            >
              Página Web
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

      <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
        <p className="text-primary-900 text-sm leading-relaxed">
          <strong>Tu catálogo para clientes</strong> es la página{' '}
          <code className="rounded bg-white/80 px-1 text-xs">/seller/…</code> del sitio público (botón
          &quot;Abrir mi catálogo público&quot;). Ahí ven tu foto, contacto, redes e inventario. Hero,
          secciones y chat de esta pantalla también aplican a esa página cuando están configurados.
          {publicSubdomainUrl ? (
            <>
              {' '}
              Tu subdominio{' '}
              <code className="rounded bg-white/80 px-1 text-xs">{publicSubdomainUrl.replace(/^https?:\/\//, '')}</code>{' '}
              es un sitio adicional del espacio, no sustituye el catálogo /seller/.
            </>
          ) : null}
          {!profile?.title ? (
            <>
              {' '}
              El subtítulo &quot;Vendedor profesional&quot; viene del{' '}
              <Link href="/settings/profile" className="underline font-medium">
                Perfil
              </Link>
              .
            </>
          ) : null}
        </p>
        {primaryPublicUrl ? (
          <p className="text-primary-800 text-xs mt-2">
            URL pública:{' '}
            <a href={primaryPublicUrl} target="_blank" rel="noopener noreferrer" className="underline">
              {primaryPublicUrl.replace(/^https?:\/\//, '')}
            </a>
          </p>
        ) : null}
      </div>

      {!subdomain && isIndependentWorkspace && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 text-sm">
            Configura un subdominio en{' '}
            <Link href="/settings/branding" className="underline">
              Branding
            </Link>{' '}
            para tu sitio adicional.
          </p>
        </div>
      )}

      {showPreview ? (
        <WebsitePreview
          settings={settings}
          branding={branding}
          profile={profile}
          primaryPublicUrl={primaryPublicUrl}
          onClose={() => setShowPreview(false)}
        />
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
          {/* Hero Section */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-bold mb-4">Sección Principal (Hero)</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Título Principal *</label>
                <input
                  type="text"
                  value={settings.hero.title}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      hero: { ...settings.hero, title: e.target.value },
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                  required
                  placeholder="Ej: Encuentra el vehículo perfecto para ti"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Subtítulo</label>
                <input
                  type="text"
                  value={settings.hero.subtitle}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      hero: { ...settings.hero, subtitle: e.target.value },
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                  placeholder="Ej: Tenemos la mejor selección de vehículos"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Texto del Botón CTA</label>
                <input
                  type="text"
                  value={settings.hero.ctaText}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      hero: { ...settings.hero, ctaText: e.target.value },
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                  placeholder="Ej: Ver Inventario"
                />
              </div>
            </div>
          </div>

          {/* Sections */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-bold mb-4">Secciones de la Página</h2>

            {/* About Section */}
            <div className="border-b pb-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.sections.about.enabled}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        sections: {
                          ...settings.sections,
                          about: { ...settings.sections.about, enabled: e.target.checked },
                        },
                      })
                    }
                    className="w-4 h-4 text-primary-600 rounded"
                  />
                  <span className="font-medium">Sección "Sobre Mí"</span>
                </label>
              </div>
              {settings.sections.about.enabled && (
                <div className="ml-6 space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">Título</label>
                    <input
                      type="text"
                      value={settings.sections.about.title}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          sections: {
                            ...settings.sections,
                            about: { ...settings.sections.about, title: e.target.value },
                          },
                        })
                      }
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Contenido</label>
                    <textarea
                      value={settings.sections.about.content}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          sections: {
                            ...settings.sections,
                            about: { ...settings.sections.about, content: e.target.value },
                          },
                        })
                      }
                      className="w-full border rounded px-3 py-2"
                      rows={4}
                      placeholder="Describe tu experiencia y servicios..."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Contact Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.sections.contact.enabled}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        sections: {
                          ...settings.sections,
                          contact: { ...settings.sections.contact, enabled: e.target.checked },
                        },
                      })
                    }
                    className="w-4 h-4 text-primary-600 rounded"
                  />
                  <span className="font-medium">Sección "Contacto"</span>
                </label>
              </div>
              {settings.sections.contact.enabled && (
                <div className="ml-6 space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">Título</label>
                    <input
                      type="text"
                      value={settings.sections.contact.title}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          sections: {
                            ...settings.sections,
                            contact: { ...settings.sections.contact, title: e.target.value },
                          },
                        })
                      }
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chat público (subdominio) */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-bold mb-4">Chat en la página pública</h2>
            <p className="text-sm text-gray-600 mb-4">
              Controla si los visitantes ven el widget de chat y el mensaje de bienvenida inicial (se guarda con
              &quot;Guardar Cambios&quot;).
            </p>
            <label className="flex items-center space-x-2 cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={settings.chat?.enabled !== false}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    chat: {
                      ...settings.chat,
                      enabled: e.target.checked,
                      welcomeMessage: settings.chat?.welcomeMessage || '',
                    },
                  })
                }
                className="w-4 h-4 text-primary-600 rounded"
              />
              <span className="font-medium">Mostrar chat a visitantes</span>
            </label>
            <div>
              <label className="block text-sm font-medium mb-2">Mensaje de bienvenida (vista previa / chat vacío)</label>
              <textarea
                value={settings.chat?.welcomeMessage || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    chat: {
                      enabled: settings.chat?.enabled !== false,
                      welcomeMessage: e.target.value,
                    },
                  })
                }
                className="w-full border rounded px-3 py-2"
                rows={2}
                placeholder="Ej: Hola, ¿en qué vehículo te puedo ayudar?"
              />
            </div>
          </div>

          {/* SEO Settings */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-bold mb-4">Configuración SEO</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Meta Título</label>
                <input
                  type="text"
                  value={settings.seo.metaTitle}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      seo: { ...settings.seo, metaTitle: e.target.value },
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                  placeholder="Título para buscadores"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Meta Descripción</label>
                <textarea
                  value={settings.seo.metaDescription}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      seo: { ...settings.seo, metaDescription: e.target.value },
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                  placeholder="Descripción para buscadores"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Palabras Clave</label>
                <input
                  type="text"
                  value={settings.seo.keywords}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      seo: { ...settings.seo, keywords: e.target.value },
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                  placeholder="palabra1, palabra2, palabra3"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function WebsitePreview({
  settings,
  branding,
  profile,
  primaryPublicUrl,
  onClose,
}: {
  settings: WebsiteSettings;
  branding: any;
  profile: any;
  primaryPublicUrl?: string;
  onClose: () => void;
}) {
  type PreviewVehicle = {
    id: string;
    make: string;
    model: string;
    year: number;
    price: number;
    currency: string;
    mileage?: number;
    condition: string;
    photos?: string[];
    images?: string[];
  };

  const [previewVehicles, setPreviewVehicles] = useState<PreviewVehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [inventoryHint, setInventoryHint] = useState<string | null>(null);
  const [previewChatOpen, setPreviewChatOpen] = useState(true);
  const [showContactFormPreview, setShowContactFormPreview] = useState(false);
  const previewScrollRef = useRef<HTMLDivElement>(null);

  const scrollToSection = useCallback((sectionId: string) => {
    const root = previewScrollRef.current;
    if (!root) return;
    const el = root.querySelector(`#${CSS.escape(sectionId)}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setVehiclesLoading(true);
      setInventoryHint(null);
      try {
        const res = await fetch('/api/settings/website/preview-data', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (res.ok) {
          const j = await res.json();
          if (!cancelled && Array.isArray(j.vehicles)) {
            setPreviewVehicles(j.vehicles);
            const c = j.counts;
            if (c?.unpublishedInWorkspace > 0 && c?.publicCatalog === 0) {
              setInventoryHint(
                `Tienes ${c.workspace} vehículo(s) en inventario, pero ninguno está marcado como publicado en página pública. Actívalo en Inventario.`
              );
            } else if (c?.publicCatalog > 0 && c?.unpublishedInWorkspace > 0) {
              setInventoryHint(
                `${c.unpublishedInWorkspace} vehículo(s) no se muestran al público porque no están publicados en página web.`
              );
            }
            return;
          }
        }

        const fallback = await fetch('/api/vehicles', { credentials: 'include', cache: 'no-store' });
        if (!fallback.ok) {
          if (!cancelled) setInventoryHint('No se pudo cargar el inventario. Recarga la página o vuelve a iniciar sesión.');
          return;
        }
        const data = await fallback.json();
        const list = (data.vehicles || []).filter(
          (v: { status?: string; deleted?: boolean }) =>
            v.status !== 'sold' && v.status !== 'deleted' && v.status !== 'inactive' && v.deleted !== true
        );
        if (!cancelled) {
          setPreviewVehicles(
            list.slice(0, 48).map((v: PreviewVehicle) => ({
              id: v.id,
              make: v.make,
              model: v.model,
              year: v.year,
              price: v.price,
              currency: v.currency || 'USD',
              mileage: v.mileage,
              condition: v.condition || 'used',
              photos: v.photos,
              images: v.images,
            }))
          );
        }
      } catch {
        if (!cancelled) {
          setPreviewVehicles([]);
          setInventoryHint('Error al cargar inventario para la vista previa.');
        }
      } finally {
        if (!cancelled) setVehiclesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPreviewChatOpen(settings.chat?.enabled !== false);
  }, [settings.chat?.enabled]);

  const primaryColor = branding?.primaryColor || '#E10600';
  const secondaryColor = branding?.secondaryColor || '#0A0A0A';
  const tenantName = profile?.name || profile?.businessName || 'Nombre del Vendedor';
  const roleLine =
    (profile?.title && String(profile.title).trim()) ||
    (profile?.jobTitle && String(profile.jobTitle).trim()) ||
    'Vendedor profesional';
  const contactPhone = profile?.phone || '';
  const contactEmail = profile?.email || '';
  const address =
    typeof profile?.address === 'object' && profile?.address !== null && !Array.isArray(profile.address)
      ? (profile.address as Record<string, string>)
      : {
          street: typeof profile?.address === 'string' ? profile.address : '',
          city: profile?.city || '',
          state: profile?.state || '',
          zipCode: profile?.zipCode || '',
        };
  const businessHours = profile?.businessHours || '';
  const socialMedia = profile?.socialMedia || {};

  const chatWelcome =
    (settings.chat?.welcomeMessage || '').trim() || 'Hola, ¿tienes el vehículo disponible?';
  const chatOn = settings.chat?.enabled !== false;

  const whatsappDigits = String(profile?.whatsapp || profile?.phone || contactPhone || '').replace(
    /[^0-9]/g,
    ''
  );

  const buildWaUrl = useCallback(
    (text?: string) => {
      if (!whatsappDigits) return null;
      const base = `https://wa.me/${whatsappDigits}`;
      return text ? `${base}?text=${encodeURIComponent(text)}` : base;
    },
    [whatsappDigits]
  );

  const openWhatsApp = useCallback(
    (text?: string) => {
      const url = buildWaUrl(text);
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        alert('Configura tu teléfono o WhatsApp en Configuración → Perfil.');
      }
    },
    [buildWaUrl]
  );

  const openContactChat = useCallback(() => {
    scrollToSection('contact');
    if (chatOn) setPreviewChatOpen(true);
  }, [scrollToSection, chatOn]);

  const openPublicVehicle = useCallback(
    (v: PreviewVehicle) => {
      if (!primaryPublicUrl) {
        alert('Usa «Abrir sitio público» en la barra superior para ver tu catálogo /seller/…');
        return;
      }
      const catalog = primaryPublicUrl.replace(/\/$/, '');
      window.open(`${catalog}#seller-inventory`, '_blank', 'noopener,noreferrer');
    },
    [primaryPublicUrl]
  );

  function firstPhoto(v: PreviewVehicle): string {
    const p = (v.photos && v.photos[0]) || (v.images && v.images[0]);
    return typeof p === 'string' ? p : '';
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 relative isolate">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Vista Previa de tu Página Web</h2>
          <p className="text-sm text-gray-600 mt-1">Así es como verán tu página los clientes</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SocialMediaLinks
            socialMedia={socialMedia}
            className="flex items-center gap-2"
            iconClassName="w-6 h-6"
          />
          {primaryPublicUrl ? (
            <a
              href={primaryPublicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium text-sm"
            >
              Abrir sitio público
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => onClose()}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
          >
            Cerrar Vista Previa
          </button>
        </div>
      </div>

      <div
        ref={previewScrollRef}
        className="relative overflow-y-auto overflow-x-hidden custom-scrollbar"
        style={{ maxHeight: 'calc(100vh - 220px)' }}
      >
        {/* Header */}
        <header
          className="text-white py-6 px-6"
          style={{ backgroundColor: primaryColor }}
        >
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold">{tenantName}</h1>
              <p className="text-white/80 mt-1">{roleLine}</p>
            </div>
            <div className="flex gap-3">
              {(whatsappDigits || contactPhone) && (
                <button
                  type="button"
                  onClick={() =>
                    openWhatsApp('Hola, estoy interesado en tus vehículos')
                  }
                  className="bg-green-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-600 flex items-center gap-2 cursor-pointer"
                >
                  <span>💬</span>
                  WhatsApp
                </button>
              )}
              <button
                type="button"
                onClick={openContactChat}
                className="bg-white px-6 py-3 rounded-lg font-medium hover:bg-gray-100 cursor-pointer"
                style={{ color: primaryColor }}
              >
                Contactar
              </button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section
          className="text-white py-20 px-6"
          style={{
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
          }}
        >
          <div className="text-center w-full max-w-4xl mx-auto px-2">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 break-words whitespace-normal leading-tight">
              {settings.hero.title || 'Encuentra el vehículo perfecto para ti'}
            </h2>
            <p className="text-lg sm:text-xl mb-8 break-words whitespace-normal leading-snug">
              {settings.hero.subtitle || 'Tenemos la mejor selección de vehículos'}
            </p>
            {settings.hero.ctaText && (
              <button
                type="button"
                onClick={() => scrollToSection('inventory')}
                className="bg-white px-8 py-3 rounded-lg font-medium hover:bg-gray-100 text-lg cursor-pointer"
                style={{ color: primaryColor }}
              >
                {settings.hero.ctaText}
              </button>
            )}
          </div>
        </section>

        {/* About Section */}
        {settings.sections.about.enabled && settings.sections.about.content && (
          <section id="about" className="bg-white py-16 px-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold mb-6 text-center">
                {settings.sections.about.title || 'Sobre Mí'}
              </h2>
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-line">
                  {settings.sections.about.content || 'Describe tu experiencia aquí...'}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Inventario real (misma fuente que la página pública del vendedor) */}
        <section className="bg-gray-50 py-12 px-6" id="inventory">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold mb-8">Mi Inventario</h2>
            {vehiclesLoading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
              </div>
            ) : previewVehicles.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <p className="text-gray-600">
                  No hay vehículos para mostrar. Si ves unidades en{' '}
                  <Link href="/inventory" className="text-primary-600 underline font-medium">
                    Inventario
                  </Link>
                  , revisa que estén activas y con &quot;Publicar en Página Pública&quot; activado.
                </p>
                {inventoryHint ? <p className="text-amber-800 text-sm bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">{inventoryHint}</p> : null}
              </div>
            ) : (
              <>
                {inventoryHint ? (
                  <p className="text-amber-800 text-sm bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6">
                    {inventoryHint}
                  </p>
                ) : null}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {previewVehicles.map((v) => {
                  const src = firstPhoto(v);
                  return (
                    <div key={v.id} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition">
                      <div className="h-48 bg-white border-b border-gray-100 flex items-center justify-center overflow-hidden">
                        {src ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={src} alt="" className="w-full h-full object-contain object-center" />
                        ) : (
                          <span className="text-gray-400 text-sm">Sin foto</span>
                        )}
                      </div>
                      <div className="p-6">
                        <h3 className="font-bold text-xl mb-2">
                          {v.year} {v.make} {v.model}
                        </h3>
                        <p className="text-2xl font-bold text-primary-600 mb-4">
                          {v.currency} {v.price.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600 mb-2">
                          Millaje: {(v.mileage ?? 0).toLocaleString()} millas
                        </p>
                        <p className="text-sm text-gray-600 mb-4 capitalize">{v.condition}</p>
                        <button
                          type="button"
                          onClick={() => openPublicVehicle(v)}
                          className="block w-full text-center bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700 cursor-pointer"
                        >
                          Ver Detalles
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              </>
            )}
          </div>
        </section>

        {/* Contact Section */}
        {settings.sections.contact.enabled !== false && (
          <section className="bg-white py-16 px-6" id="contact">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold mb-8 text-center">
                {settings.sections.contact.title || 'Contáctame'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gray-50 rounded-lg shadow p-6">
                  <h3 className="text-xl font-bold mb-4">Información de Contacto</h3>
                  <div className="space-y-3">
                    {contactPhone && (
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">📞</span>
                        <div>
                          <p className="text-sm text-gray-600">Teléfono</p>
                          <a href={`tel:${contactPhone.replace(/\s/g, '')}`} className="text-primary-600 hover:underline">
                            {contactPhone}
                          </a>
                        </div>
                      </div>
                    )}
                    {contactEmail && (
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">✉️</span>
                        <div>
                          <p className="text-sm text-gray-600">Email</p>
                          <a href={`mailto:${contactEmail}`} className="text-primary-600 hover:underline">
                            {contactEmail}
                          </a>
                        </div>
                      </div>
                    )}
                    {(address.street || address.city) && (
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl">📍</span>
                        <div>
                          <p className="text-sm text-gray-600">Dirección</p>
                          <p className="text-gray-900">
                            {[address.street, address.city, address.state, address.zipCode]
                              .filter(Boolean)
                              .join(', ') || 'Dirección no configurada'}
                          </p>
                        </div>
                      </div>
                    )}
                    {businessHours && (
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl">🕐</span>
                        <div>
                          <p className="text-sm text-gray-600">Horarios</p>
                          <p className="text-gray-900 whitespace-pre-line">{businessHours}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {(socialMedia.facebook ||
                    socialMedia.instagram ||
                    socialMedia.tiktok ||
                    socialMedia.linkedin) && (
                    <div className="mt-6 pt-6 border-t">
                      <p className="text-sm text-gray-600 mb-3">Sígueme en:</p>
                      <SocialMediaLinks socialMedia={socialMedia} />
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 rounded-lg shadow p-6">
                  <h3 className="text-xl font-bold mb-4">Envíame un Mensaje</h3>
                  <div className="space-y-3">
                    {(() => {
                      const wa = buildWaUrl('Hola, me gustaría recibir más información');
                      return wa ? (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-green-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-600 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>💬</span>
                        Escribir por WhatsApp
                      </a>
                      ) : null;
                    })()}
                    <button
                      type="button"
                      onClick={() => setShowContactFormPreview(true)}
                      className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 cursor-pointer"
                    >
                      Abrir Formulario de Contacto
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <footer className="bg-gray-900 text-white py-8 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-lg font-bold mb-4">{tenantName}</h3>
                <p className="text-gray-400 text-sm">
                  {(profile?.description || profile?.bio || '').toString().substring(0, 150) ||
                    'Descripción del vendedor...'}
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Contacto</h4>
                <div className="space-y-2 text-sm text-gray-400">
                  {contactPhone && <p>📞 {contactPhone}</p>}
                  {contactEmail && <p>✉️ {contactEmail}</p>}
                  {(address.street || address.city) && (
                    <p>📍 {[address.street, address.city, address.state].filter(Boolean).join(', ')}</p>
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Enlaces</h4>
                <div className="space-y-2 text-sm">
                  <button
                    type="button"
                    onClick={() => scrollToSection('inventory')}
                    className="text-gray-400 hover:text-white block text-left w-full cursor-pointer"
                  >
                    Inventario
                  </button>
                  {settings.sections.about.enabled && (
                    <button
                      type="button"
                      onClick={() => scrollToSection('about')}
                      className="text-gray-400 hover:text-white block text-left w-full cursor-pointer"
                    >
                      Sobre Mí
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => scrollToSection('contact')}
                    className="text-gray-400 hover:text-white block text-left w-full cursor-pointer"
                  >
                    Contacto
                  </button>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-800 mt-8 pt-6 text-center text-sm text-gray-400">
              <p>
                © {new Date().getFullYear()} {tenantName}. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </footer>

        {chatOn ? (
          <div className="sticky bottom-0 z-10 flex justify-end p-4 pointer-events-none">
            {previewChatOpen ? (
            <div className="pointer-events-auto w-full max-w-xs bg-white rounded-lg shadow-xl border border-gray-200">
              <div className="bg-primary-600 text-white px-4 py-3 rounded-t-lg flex justify-between items-center">
                <span className="font-medium text-sm">Vista previa del chat</span>
                <button
                  type="button"
                  onClick={() => setPreviewChatOpen(false)}
                  className="text-white/90 hover:text-white text-lg leading-none px-1"
                  aria-label="Ocultar chat de vista previa"
                >
                  ×
                </button>
              </div>
              <div className="p-4 bg-gray-50 max-h-36 overflow-y-auto">
                <p className="text-xs text-gray-500 mb-2">
                  En tu página pública el chat se guarda con &quot;Guardar Cambios&quot; en Página Web.
                </p>
                <div className="bg-white rounded-lg p-3 shadow-sm text-sm">{chatWelcome}</div>
              </div>
            </div>
            ) : (
              <button
                type="button"
                onClick={() => setPreviewChatOpen(true)}
                className="pointer-events-auto bg-primary-600 text-white text-sm px-4 py-2 rounded-full shadow-lg hover:bg-primary-700"
              >
                Mostrar chat (vista previa)
              </button>
            )}
          </div>
        ) : (
          <p className="text-center text-sm text-gray-500 py-4 px-6 border-t border-gray-100 bg-gray-50">
            Chat desactivado. Actívalo en Página Web y guarda cambios.
          </p>
        )}
      </div>

      {showContactFormPreview ? (
        <WebsitePreviewContactFormModal
          tenantId={profile?.tenantId as string | undefined}
          tenantName={tenantName}
          onClose={() => setShowContactFormPreview(false)}
        />
      ) : null}
    </div>
  );
}

function WebsitePreviewContactFormModal({
  tenantId,
  tenantName,
  onClose,
}: {
  tenantId?: string;
  tenantName: string;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (tenantId) {
        const res = await fetch('/api/leads', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: 'web_preview',
            contact: {
              name: formData.name,
              phone: formData.phone,
              email: formData.email,
            },
            notes: `[Vista previa página web] ${formData.message}`,
          }),
        });
        if (res.ok) {
          alert('Mensaje de prueba guardado como lead en tu CRM.');
          onClose();
          return;
        }
      }
      alert(
        'Vista previa: en tu página pública, este formulario enviará el mensaje directamente a tus leads.'
      );
      onClose();
    } catch {
      alert('No se pudo enviar. En el sitio público el formulario funcionará para tus clientes.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Contáctanos</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <p className="px-6 pt-4 text-sm text-gray-500">
          Vista previa del formulario de {tenantName}. Los clientes lo verán en tu sitio público.
        </p>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Teléfono</label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Mensaje</label>
            <textarea
              required
              rows={4}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Enviando…' : 'Enviar mensaje'}
          </button>
        </form>
      </div>
    </div>
  );
}

