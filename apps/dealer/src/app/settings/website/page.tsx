'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PromoVideosEditor } from '@autodealers/shared/components/PromoVideosEditor';
import { normalizePromoVideoUrls, heroPromoVideoFields } from '@autodealers/shared/promo-video-urls';

interface WebsiteSettings {
  hero: {
    title: string;
    subtitle: string;
    ctaText: string;
    backgroundImage?: string;
    /** YouTube, Vimeo o URL HTTPS a .mp4/.webm — se muestra antes del inventario en la web pública */
    promoVideoUrl?: string;
    promoVideoUrls?: string[];
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
      items: Array<{ title: string; description: string; icon: string }>;
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
}

export default function WebsiteSettingsPage() {
  const [settings, setSettings] = useState<WebsiteSettings>({
    hero: {
      title: 'Encuentra el vehículo perfecto para ti',
      subtitle: 'Tenemos la mejor selección de vehículos',
      ctaText: 'Ver Inventario',
      promoVideoUrl: '',
      promoVideoUrls: [],
    },
    sections: {
      about: {
        enabled: true,
        title: 'Sobre Nosotros',
        content: '',
      },
      services: {
        enabled: true,
        title: 'Nuestros Servicios',
        items: [],
      },
      testimonials: {
        enabled: false,
        title: 'Testimonios',
      },
      contact: {
        enabled: true,
        title: 'Contáctanos',
        showMap: false,
      },
    },
    layout: {
      headerStyle: 'default',
      footerStyle: 'default',
      colorScheme: 'light',
    },
    seo: {
      metaTitle: '',
      metaDescription: '',
      keywords: '',
    },
  });
  const [subdomain, setSubdomain] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [branding, setBranding] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [sellerInfo, setSellerInfo] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [socialPosts, setSocialPosts] = useState<any[]>([]);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    try {
      const [websiteRes, brandingRes, profileRes, reviewsRes, socialRes] = await Promise.all([
        fetch('/api/settings/website'),
        fetch('/api/settings/branding'),
        fetch('/api/settings/profile'),
        fetch('/api/reviews?limit=6').catch(() => null),
        fetch('/api/social/posts?limit=6').catch(() => null),
      ]);

      if (websiteRes.ok) {
        const data = await websiteRes.json();
        if (data.settings) {
          const hero = data.settings.hero || {};
          const promoUrls = normalizePromoVideoUrls(hero.promoVideoUrls, hero.promoVideoUrl);
          setSettings((prev) => ({
            ...prev,
            ...data.settings,
            hero: {
              ...prev.hero,
              ...hero,
              promoVideoUrls: promoUrls,
              promoVideoUrl: promoUrls[0] || '',
            },
          }));
        }
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

      // Obtener reseñas
      if (reviewsRes && reviewsRes.ok) {
        const reviewsData = await reviewsRes.json();
        const approvedReviews = (reviewsData.reviews || []).filter((r: any) => r.status === 'approved');
        setReviews(approvedReviews);
      }

      // Obtener posts sociales
      if (socialRes && socialRes.ok) {
        const socialData = await socialRes.json();
        setSocialPosts(socialData.posts || []);
      }

      // Obtener información del vendedor desde el perfil o usuarios
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        // Intentar obtener info del usuario actual
        try {
          const userRes = await fetch('/api/auth/me').catch(() => null);
          if (userRes && userRes.ok) {
            const userData = await userRes.json();
            if (userData.userId) {
              // Obtener detalles del usuario
              const userDetailsRes = await fetch(`/api/users/${userData.userId}`).catch(() => null);
              if (userDetailsRes && userDetailsRes.ok) {
                const userDetails = await userDetailsRes.json();
                if (userDetails.user) {
                  setSellerInfo({
                    id: userDetails.user.id,
                    name: userDetails.user.name,
                    photo: userDetails.user.photo || userDetails.user.profilePhoto || null,
                    bio: userDetails.user.bio || null,
                  });
                }
              }
            }
          }
        } catch (e) {
          console.log('No se pudo obtener info del vendedor:', e);
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function uploadDealerPromoFile(file: File): Promise<string | null> {
    try {
      const { fetchWithAuth } = await import('@/lib/fetch-with-auth');
      const form = new FormData();
      form.append('file', file);
      form.append('type', 'dealer_website_promo');
      const res = await fetchWithAuth('/api/upload', { method: 'POST', body: form });
      if (!res.ok) return null;
      const data = await res.json();
      return typeof data.url === 'string' ? data.url : null;
    } catch {
      return null;
    }
  }

  function setPromoVideoUrls(urls: string[]) {
    const fields = heroPromoVideoFields(urls);
    setSettings((prev) => ({
      ...prev,
      hero: { ...prev.hero, ...fields },
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const promoUrls = normalizePromoVideoUrls(
        settings.hero.promoVideoUrls,
        settings.hero.promoVideoUrl
      );
      const payload = {
        ...settings,
        hero: { ...settings.hero, ...heroPromoVideoFields(promoUrls) },
      };
      const response = await fetch('/api/settings/website', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert('Configuración de la página web guardada exitosamente');
      } else {
        alert('Error al guardar la configuración');
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

  const publicUrl = typeof window !== 'undefined' && subdomain
    ? `${window.location.protocol}//${subdomain}.${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`
    : 'Configura un subdominio primero';

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
            {subdomain && (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
              >
                🔗 Abrir Página Pública
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
              href="/settings/templates"
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Templates
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

      {!subdomain && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800">
            ⚠️ Configura un subdominio en <Link href="/settings/branding" className="underline">Branding</Link> para tener tu página web pública.
          </p>
        </div>
      )}

      {showPreview ? (
        <WebsitePreview
          settings={settings}
          branding={branding}
          profile={profile}
          sellerInfo={sellerInfo}
          reviews={reviews}
          socialPosts={socialPosts}
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
                <p className="text-xs text-gray-500 mt-1">
                  Este título aparecerá en la sección principal de tu página web
                </p>
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
                <p className="text-xs text-gray-500 mt-1">
                  Si no especificas un subtítulo, se mostrará el conteo de vehículos disponibles
                </p>
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
                <p className="text-xs text-gray-500 mt-1">
                  El botón llevará a los visitantes directamente al inventario
                </p>
              </div>

              <div className="border-t pt-4 mt-4">
                <PromoVideosEditor
                  urls={settings.hero.promoVideoUrls || []}
                  onChange={setPromoVideoUrls}
                  onUploadFile={uploadDealerPromoFile}
                  onSave={handleSave}
                  saving={saving}
                  title="Videos promocionales del dealer"
                  description="Varios videos en tu mini-sitio público, en filas de dos antes del inventario."
                />
              </div>
            </div>

            <div className="mt-4 p-4 bg-primary-50 border border-primary-200 rounded-lg">
              <p className="text-sm text-primary-800">
                💡 <strong>Nota:</strong> La información de contacto (teléfono, email, dirección, horarios, redes sociales)
                se toma automáticamente de tu <Link href="/settings/profile" className="underline">Perfil</Link>.
                Asegúrate de tener toda tu información actualizada allí.
              </p>
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
                  <span className="font-medium">Sección "Sobre Nosotros"</span>
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
                      placeholder="Describe tu negocio..."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Services Section */}
            <div className="border-b pb-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.sections.services.enabled}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        sections: {
                          ...settings.sections,
                          services: { ...settings.sections.services, enabled: e.target.checked },
                        },
                      })
                    }
                    className="w-4 h-4 text-primary-600 rounded"
                  />
                  <span className="font-medium">Sección "Servicios"</span>
                </label>
              </div>
              {settings.sections.services.enabled && (
                <div className="ml-6">
                  <label className="block text-sm font-medium mb-2">Título</label>
                  <input
                    type="text"
                    value={settings.sections.services.title}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        sections: {
                          ...settings.sections,
                          services: { ...settings.sections.services, title: e.target.value },
                        },
                      })
                    }
                    className="w-full border rounded px-3 py-2 mb-3"
                  />
                </div>
              )}
            </div>

            {/* Testimonials Section */}
            <div className="border-b pb-4 mb-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.sections.testimonials.enabled}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      sections: {
                        ...settings.sections,
                        testimonials: { ...settings.sections.testimonials, enabled: e.target.checked },
                      },
                    })
                  }
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <span className="font-medium">Sección "Testimonios"</span>
              </label>
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
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.sections.contact.showMap}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          sections: {
                            ...settings.sections,
                            contact: { ...settings.sections.contact, showMap: e.target.checked },
                          },
                        })
                      }
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <span className="text-sm">Mostrar mapa de ubicación</span>
                  </label>
                </div>
              )}
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
  sellerInfo,
  reviews,
  socialPosts,
  onClose,
}: {
  settings: WebsiteSettings;
  branding: any;
  profile: any;
  sellerInfo?: any;
  reviews?: any[];
  socialPosts?: any[];
  onClose: () => void;
}) {
  const primaryColor = branding?.primaryColor || '#E10600';
  const secondaryColor = branding?.secondaryColor || '#0A0A0A';
  const tenantName = profile?.businessName || 'Nombre del Dealer';
  const contactPhone = profile?.phone || '';
  const contactEmail = profile?.email || '';
  const address = profile?.address || {};
  const businessHours = profile?.businessHours || '';
  const socialMedia = profile?.socialMedia || {};

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Vista Previa de tu Página Web</h2>
          <p className="text-sm text-gray-600 mt-1">Así es como verán tu página los clientes</p>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
        >
          Cerrar Vista Previa
        </button>
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {/* Header */}
        <header
          className="text-white py-6 px-6"
          style={{ backgroundColor: primaryColor }}
        >
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">{tenantName}</h1>
              <p className="text-white/80 mt-1">Tu concesionario de confianza</p>
            </div>
            <div className="flex gap-3">
              {contactPhone && (
                <button className="bg-green-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-600 flex items-center gap-2">
                  <span>💬</span>
                  WhatsApp
                </button>
              )}
              <button className="bg-white text-primary-600 px-6 py-3 rounded-lg font-medium hover:bg-gray-100">
                Contactar
              </button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section
          className="text-white py-20 px-6"
          style={{
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
          }}
        >
          <div className="text-center max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-4">
              {settings.hero.title || 'Encuentra el vehículo perfecto para ti'}
            </h2>
            <p className="text-xl mb-8">
              {settings.hero.subtitle || 'Tenemos la mejor selección de vehículos'}
            </p>
            {settings.hero.ctaText && (
              <button className="bg-white text-primary-600 px-8 py-3 rounded-lg font-medium hover:bg-gray-100 text-lg">
                {settings.hero.ctaText}
              </button>
            )}
          </div>
        </section>

        {settings.hero.promoVideoUrl ? (
          <section className="bg-gray-50 py-8 px-6 border-y border-gray-200">
            <p className="text-center text-sm text-gray-600 mb-3">Vista previa del video (antes del inventario)</p>
            <div className="max-w-3xl mx-auto aspect-video rounded-lg overflow-hidden bg-black shadow">
              {(() => {
                const raw = (settings.hero.promoVideoUrl || '').trim();
                if (!raw) return null;
                let u: URL;
                try {
                  u = new URL(raw.includes('://') ? raw : `https://${raw}`);
                } catch {
                  return <p className="text-white text-center p-8 text-sm">URL no válida</p>;
                }
                const host = u.hostname.replace(/^www\./, '');
                if (host === 'youtu.be') {
                  const id = u.pathname.replace(/^\//, '').split('/')[0];
                  if (!id) return null;
                  return (
                    <iframe
                      title="Preview video"
                      src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  );
                }
                if (
                  host === 'youtube.com' ||
                  host === 'm.youtube.com' ||
                  host === 'youtube-nocookie.com'
                ) {
                  const v = u.searchParams.get('v');
                  const shorts = u.pathname.match(/^\/shorts\/([\w-]+)/);
                  const embed = u.pathname.match(/^\/embed\/([\w-]+)/);
                  const id = v || shorts?.[1] || embed?.[1];
                  if (!id) return <p className="text-white text-center p-8 text-sm">No se detectó el ID del video de YouTube</p>;
                  return (
                    <iframe
                      title="Preview video"
                      src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  );
                }
                if (host === 'vimeo.com' || host === 'player.vimeo.com') {
                  const m = u.pathname.match(/\/(?:video\/)?(\d+)/);
                  const id = m?.[1];
                  if (!id) return null;
                  return (
                    <iframe
                      title="Preview video"
                      src={`https://player.vimeo.com/video/${encodeURIComponent(id)}`}
                      className="w-full h-full border-0"
                      allowFullScreen
                    />
                  );
                }
                if (u.protocol === 'https:' && /\.(mp4|webm|ogg)(\?|$)/i.test(u.pathname)) {
                  return <video className="w-full h-full object-contain" controls src={u.toString()} />;
                }
                return <p className="text-white text-center p-8 text-sm">Formato no reconocido en vista previa</p>;
              })()}
            </div>
          </section>
        ) : null}

        {/* Seller Profile Section */}
        {sellerInfo && (
          <section className="bg-white py-16 px-6">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-8 text-center">Conoce a tu Vendedor</h2>
              <div className="bg-gray-50 rounded-lg p-8 flex flex-col md:flex-row items-center gap-8">
                {sellerInfo.photo ? (
                  <img
                    src={sellerInfo.photo}
                    alt={sellerInfo.name}
                    className="w-48 h-48 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-48 h-48 rounded-full bg-primary-600 flex items-center justify-center text-6xl text-white border-4 border-white shadow-lg">
                    {sellerInfo.name?.charAt(0)?.toUpperCase() || '👤'}
                  </div>
                )}
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-2xl font-bold mb-2">{sellerInfo.name}</h3>
                  {sellerInfo.bio && (
                    <p className="text-gray-700 text-lg leading-relaxed">
                      {sellerInfo.bio}
                    </p>
                  )}
                  <div className="mt-4">
                    <button className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium">
                      📅 Agendar una Cita
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* About Section */}
        {settings.sections.about.enabled && settings.sections.about.content && (
          <section className="bg-white py-16 px-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold mb-6 text-center">
                {settings.sections.about.title || 'Sobre Nosotros'}
              </h2>
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-line">
                  {settings.sections.about.content || 'Describe tu negocio aquí...'}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Reviews Section */}
        {reviews && reviews.length > 0 && (
          <section className="bg-gray-50 py-16 px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold mb-4">Reseñas de Nuestros Clientes</h2>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-3xl font-bold">
                    {(reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length).toFixed(1)}
                  </span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className="text-yellow-400 text-lg">★</span>
                    ))}
                  </div>
                  <span className="text-gray-600">({reviews.length} reseñas)</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reviews.slice(0, 6).map((review: any) => (
                  <div key={review.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-semibold text-gray-900">{review.customerName}</div>
                      {review.featured && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                          ⭐ Destacada
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1 mb-3">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className={star <= review.rating ? 'text-yellow-400' : 'text-gray-300'}>
                          ★
                        </span>
                      ))}
                    </div>
                    <p className="text-gray-700 text-sm line-clamp-3">{review.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Social Media Posts Section */}
        {socialPosts && socialPosts.length > 0 && (
          <section className="bg-white py-16 px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold mb-4">Síguenos en Redes Sociales</h2>
                <p className="text-gray-600">Mira nuestras últimas publicaciones</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {socialPosts.slice(0, 6).map((post: any) => (
                  <div key={post.id} className="bg-gray-50 rounded-lg shadow overflow-hidden hover:shadow-lg transition">
                    {post.media && post.media.length > 0 && (
                      <div className="relative h-48 bg-gray-200">
                        <img
                          src={post.media[0]}
                          alt="Post"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex gap-2 mb-3">
                        {post.platforms?.map((platform: string) => (
                          <span
                            key={platform}
                            className="text-sm bg-primary-100 text-primary-700 px-2 py-1 rounded"
                          >
                            {platform === 'facebook' ? '📘' : platform === 'instagram' ? '📷' : '🎵'} {platform}
                          </span>
                        ))}
                      </div>
                      <p className="text-gray-700 mb-3 line-clamp-3">{post.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Inventory Preview */}
        <section className="bg-gray-50 py-12 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold mb-8">Nuestro Inventario</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Sample Vehicle Cards */}
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition">
                  <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                    <span className="text-gray-400 text-sm">Imagen del Vehículo</span>
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-xl mb-2">2024 Toyota Camry</h3>
                    <p className="text-2xl font-bold text-primary-600 mb-4">$25,000 USD</p>
                    <p className="text-sm text-gray-600 mb-2">50,000 km</p>
                    <p className="text-sm text-gray-600 mb-4 capitalize">Usado</p>
                    <button className="block w-full text-center bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700">
                      Ver Detalles
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Section */}
        {settings.sections.contact.enabled !== false && (
          <section className="bg-white py-16 px-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold mb-8 text-center">
                {settings.sections.contact.title || 'Contáctanos'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Contact Info */}
                <div className="bg-gray-50 rounded-lg shadow p-6">
                  <h3 className="text-xl font-bold mb-4">Información de Contacto</h3>
                  <div className="space-y-3">
                    {contactPhone && (
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">📞</span>
                        <div>
                          <p className="text-sm text-gray-600">Teléfono</p>
                          <p className="text-primary-600">{contactPhone}</p>
                        </div>
                      </div>
                    )}
                    {contactEmail && (
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">✉️</span>
                        <div>
                          <p className="text-sm text-gray-600">Email</p>
                          <p className="text-primary-600">{contactEmail}</p>
                        </div>
                      </div>
                    )}
                    {(address.street || address.city) && (
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl">📍</span>
                        <div>
                          <p className="text-sm text-gray-600">Dirección</p>
                          <p className="text-gray-900">
                            {[address.street, address.city, address.state, address.zipCode].filter(Boolean).join(', ') || 'Dirección no configurada'}
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

                  {/* Social Media */}
                  {(socialMedia.facebook || socialMedia.instagram || socialMedia.tiktok) && (
                    <div className="mt-6 pt-6 border-t">
                      <p className="text-sm text-gray-600 mb-3">Síguenos en:</p>
                      <div className="flex gap-3">
                        {socialMedia.facebook && <span className="text-2xl">📘</span>}
                        {socialMedia.instagram && <span className="text-2xl">📷</span>}
                        {socialMedia.tiktok && <span className="text-2xl">🎵</span>}
                      </div>
                    </div>
                  )}
                </div>

                {/* Contact Form */}
                <div className="bg-gray-50 rounded-lg shadow p-6">
                  <h3 className="text-xl font-bold mb-4">Envíanos un Mensaje</h3>
                  <div className="space-y-3">
                    {contactPhone && (
                      <button className="w-full bg-green-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-600 flex items-center justify-center gap-2">
                        <span>💬</span>
                        Escribir por WhatsApp
                      </button>
                    )}
                    <button className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700">
                      Abrir Formulario de Contacto
                    </button>
                  </div>
                </div>
              </div>

              {/* Map Preview */}
              {settings.sections.contact.showMap && (
                <div className="mt-8 bg-gray-50 rounded-lg shadow p-6">
                  <h3 className="text-xl font-bold mb-4">Ubicación</h3>
                  <div className="h-64 bg-gray-200 rounded flex items-center justify-center">
                    <p className="text-gray-600 text-center">
                      Mapa de Google Maps se mostrará aquí
                      <br />
                      <span className="text-sm">
                        {[address.street, address.city, address.state].filter(Boolean).join(', ') || 'Dirección no configurada'}
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-8 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-lg font-bold mb-4">{tenantName}</h3>
                <p className="text-gray-400 text-sm">
                  {profile?.description?.substring(0, 150) || 'Descripción del negocio...'}
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
                  <a href="#inventory" className="text-gray-400 hover:text-white block">Inventario</a>
                  {settings.sections.about.enabled && (
                    <a href="#about" className="text-gray-400 hover:text-white block">Sobre Nosotros</a>
                  )}
                  <a href="#contact" className="text-gray-400 hover:text-white block">Contacto</a>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-800 mt-8 pt-6 text-center text-sm text-gray-400">
              <p>© {new Date().getFullYear()} {tenantName}. Todos los derechos reservados.</p>
            </div>
          </div>
        </footer>

        {/* Chat Widget Preview */}
        <div className="fixed bottom-6 right-6 z-50">
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200 w-80">
            <div className="bg-primary-600 text-white px-4 py-3 rounded-t-lg flex justify-between items-center">
              <span className="font-medium">💬 Chat</span>
              <button className="text-white/80 hover:text-white">×</button>
            </div>
            <div className="p-4 h-64 bg-gray-50 overflow-y-auto">
              <div className="space-y-3">
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-sm">Hola, ¿tienen el vehículo disponible?</p>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Escribe un mensaje..."
                  className="flex-1 border rounded px-3 py-2 text-sm"
                  disabled
                />
                <button className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700">
                  Enviar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

