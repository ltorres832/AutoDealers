'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { SocialMediaLinks, type SocialMediaMap } from '@/components/SocialMediaLinks';
import PublicReviewsList, { type PublicReviewItem } from '@/components/PublicReviewsList';
import PublicPromoVideoGrid from '@/components/PublicPromoVideoGrid';
import ChatWidget from '@/components/ChatWidget';
import { getFirstPhoto, handleImageError } from '@/lib/vehicle-image';
import { getPublicVehicleConditionLabel } from '@/lib/vehicle-condition-label';
import { pingCatalogVehicleClick } from '@/lib/catalog-vehicle-click';
import { buildPublicVehicleDetailHref, vehicleCatalogTenantId } from '@/lib/public-vehicle-detail-href';
import { PublicTrustGallery } from '@autodealers/shared/components/PublicTrustGallery';
import {
  DEFAULT_HERO_CTA,
  DEFAULT_HERO_SUBTITLE,
  DEFAULT_HERO_TITLE,
  repairHeroSubtitle,
  repairHeroTitle,
  toWebsiteSettingsView,
} from '@/lib/website-settings-normalize';
import { resolveBusinessHours } from '@/lib/resolve-business-hours';
import ContactCardHeroHeader from '@/components/ContactCardHeroHeader';
export interface SellerPublicWebsiteSeller {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsapp?: string;
  photo?: string;
  title?: string;
  tenantId: string;
  tenantName: string;
  sellerRating?: number;
  sellerRatingCount?: number;
  website?: string;
  publicPromoVideoUrl?: string;
  publicPromoVideoUrls?: string[];
  publicTrustGalleryPhotos?: string[];
  socialMedia?: SocialMediaMap;
}

export interface SellerPublicWebsiteVehicle {
  id: string;
  tenantId?: string;
  make: string;
  model: string;
  year: number;
  price: number;
  currency: string;
  photos?: string[];
  images?: string[];
  mileage?: number;
  condition: string;
  description?: string;
  status?: string;
  showSoldBadge?: boolean;
  showPublicSoldBadge?: boolean;
  specifications?: { trim?: string };
}

export interface SellerPublicWebsiteBranding {
  primaryColor: string;
  secondaryColor: string;
}

export interface SellerPublicWebsiteProfile {
  bio?: string;
  description?: string;
  address?: unknown;
  city?: string;
  state?: string;
  zipCode?: string;
  businessHours?: string;
}

export interface SellerPublicWebsiteSettings {
  hero?: {
    title?: string;
    subtitle?: string;
    ctaText?: string;
  };
  sections?: {
    about?: { enabled?: boolean; title?: string; content?: string };
    contact?: { enabled?: boolean; title?: string; showMap?: boolean };
  };
  chat?: { enabled?: boolean; welcomeMessage?: string };
}

export interface SellerPublicWebsiteProps {
  seller: SellerPublicWebsiteSeller;
  vehicles: SellerPublicWebsiteVehicle[];
  reviews: PublicReviewItem[];
  websiteSettings: SellerPublicWebsiteSettings | null;
  branding: SellerPublicWebsiteBranding;
  profile: SellerPublicWebsiteProfile;
}

function parseAddress(profile: SellerPublicWebsiteProfile): {
  street: string;
  city: string;
  state: string;
  zipCode: string;
} {
  const raw = profile.address;
  if (typeof raw === 'string' && raw.trim()) {
    return { street: raw.trim(), city: profile.city || '', state: profile.state || '', zipCode: profile.zipCode || '' };
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const a = raw as Record<string, string>;
    return {
      street: a.street || '',
      city: a.city || profile.city || '',
      state: a.state || profile.state || '',
      zipCode: a.zipCode || profile.zipCode || '',
    };
  }
  return {
    street: '',
    city: profile.city || '',
    state: profile.state || '',
    zipCode: profile.zipCode || '',
  };
}

function SellerContactFormModal({
  tenantId,
  sellerId,
  sellerName,
  onClose,
}: {
  tenantId: string;
  sellerId: string;
  sellerName: string;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/leads/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          sellerId,
          source: 'web',
          contact: formData,
          notes: formData.message,
          leadFormResponses: {
            Mensaje: formData.message,
            Email: formData.email,
          },
        }),
      });
      if (response.ok) {
        alert('¡Gracias por contactarnos! Te responderemos pronto.');
        onClose();
        setFormData({ name: '', phone: '', email: '', message: '' });
      } else {
        alert('Error al enviar mensaje');
      }
    } catch {
      alert('Error al enviar mensaje');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold">Contactar a {sellerName}</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl" aria-label="Cerrar">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nombre</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Teléfono</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Mensaje</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full border rounded px-3 py-2"
              rows={4}
              required
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

export default function SellerPublicWebsite({
  seller,
  vehicles,
  reviews,
  websiteSettings,
  branding,
  profile,
}: SellerPublicWebsiteProps) {
  const [showContactForm, setShowContactForm] = useState(false);

  const primaryColor = branding.primaryColor || '#E10600';
  const secondaryColor = branding.secondaryColor || '#0A0A0A';
  const settingsView = websiteSettings
    ? toWebsiteSettingsView(websiteSettings as unknown as Record<string, unknown>)
    : toWebsiteSettingsView({});
  const hero = settingsView.hero;
  const sections = websiteSettings?.sections;
  const chatOn = websiteSettings?.chat?.enabled !== false;

  const roleLine =
    (seller.title && String(seller.title).trim()) || 'Vendedor profesional';
  const contactPhone = seller.phone || '';
  const contactEmail = seller.email || '';
  const address = parseAddress(profile);
  const businessHours = resolveBusinessHours(profile.businessHours);
  const socialMedia = seller.socialMedia || {};
  const bio =
    (profile.description && profile.description.trim()) ||
    (profile.bio && profile.bio.trim()) ||
    '';

  const whatsappDigits = String(seller.whatsapp || seller.phone || '').replace(/[^0-9]/g, '');

  const buildWaUrl = useCallback(
    (text?: string) => {
      if (!whatsappDigits) return null;
      const base = `https://wa.me/${whatsappDigits}`;
      return text ? `${base}?text=${encodeURIComponent(text)}` : base;
    },
    [whatsappDigits]
  );

  const scrollToSection = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const openContactChat = useCallback(() => {
    scrollToSection('contact');
    if (chatOn) window.dispatchEvent(new CustomEvent('openChat'));
  }, [scrollToSection, chatOn]);

  const aboutEnabled = sections?.about?.enabled !== false;
  const aboutContent = sections?.about?.content?.trim() || bio;
  const contactEnabled = sections?.contact?.enabled !== false;
  const catalogUrl = `/seller/${seller.id}`;
  return (
    <div className="min-h-screen bg-white">
      <header className="text-white py-6 px-4 sm:px-6" style={{ backgroundColor: primaryColor }}>
        <div className="max-w-6xl mx-auto flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{seller.name}</h1>
            <p className="text-white/80 mt-1">{roleLine}</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {whatsappDigits ? (
              <a
                href={buildWaUrl('Hola, estoy interesado en tus vehículos') || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-500 text-white px-5 py-2.5 sm:px-6 sm:py-3 rounded-lg font-medium hover:bg-green-600 flex items-center gap-2"
              >
                <span aria-hidden>💬</span>
                WhatsApp
              </a>
            ) : null}
            <button
              type="button"
              onClick={openContactChat}
              className="bg-white px-5 py-2.5 sm:px-6 sm:py-3 rounded-lg font-medium hover:bg-gray-100"
              style={{ color: primaryColor }}
            >
              Contactar
            </button>
          </div>
        </div>
      </header>

      <section
        className="text-white py-16 sm:py-20 px-4 sm:px-6"
        style={{
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
        }}
      >
        <div className="text-center w-full max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 break-words leading-tight">
            {repairHeroTitle(hero.title)}
          </h2>
          <p className="text-lg sm:text-xl mb-8 text-white/90 break-words">
            {repairHeroSubtitle(hero.subtitle)}
          </p>
          <button
            type="button"
            onClick={() => scrollToSection('inventory')}
            className="bg-white px-8 py-3 rounded-lg font-medium hover:bg-gray-100 text-lg"
            style={{ color: primaryColor }}
          >
            {hero.ctaText}
          </button>
        </div>
      </section>

      {aboutEnabled && aboutContent ? (
        <section id="about" className="bg-white py-16 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-center">
              {sections?.about?.title || 'Sobre Mí'}
            </h2>
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-line">{aboutContent}</p>
            </div>
          </div>
        </section>
      ) : null}

      <PublicPromoVideoGrid
        urls={seller.publicPromoVideoUrls}
        legacyUrl={seller.publicPromoVideoUrl}
        className="max-w-6xl mx-auto px-4 sm:px-6 py-8"
        titlePrefix={`Video — ${seller.name}`}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <PublicTrustGallery photos={seller.publicTrustGalleryPhotos || []} />
      </div>

      <section className="bg-gray-50 py-12 px-4 sm:px-6" id="inventory">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Mi Inventario</h2>
          {vehicles.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-600">Este vendedor no tiene vehículos publicados aún.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vehicles.map((v) => {
                const conditionLabel = getPublicVehicleConditionLabel(v);
                const showSold =
                  v.status === 'sold' || v.showSoldBadge === true || v.showPublicSoldBadge === true;
                const photo = getFirstPhoto(v);
                const catalogTenantId = vehicleCatalogTenantId(v, seller.tenantId);
                const detailHref = buildPublicVehicleDetailHref({
                  vehicleId: v.id,
                  tenantId: catalogTenantId,
                  sellerId: seller.id,
                });
                return (
                  <div
                    key={v.id}
                    className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition flex flex-col"
                  >
                    <Link
                      href={detailHref}
                      className="block group"
                      onClick={() =>
                        pingCatalogVehicleClick({
                          vehicleId: v.id,
                          tenantId: catalogTenantId,
                          surface: 'seller_inventory',
                        })
                      }
                    >
                      <div className="h-48 bg-white border-b border-gray-100 flex items-center justify-center overflow-hidden relative">
                        {photo ? (
                          <img
                            src={photo}
                            alt={`${v.year} ${v.make} ${v.model}`}
                            className={`w-full h-full object-contain object-center ${showSold ? 'opacity-70' : ''}`}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={handleImageError}
                          />
                        ) : (
                          <span className="text-gray-400 text-sm">Sin foto</span>
                        )}
                        {showSold ? (
                          <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="text-2xl font-black text-white border-4 border-white px-3 py-1 rotate-[-6deg] drop-shadow-lg">
                              VENDIDO
                            </span>
                          </span>
                        ) : null}
                      </div>
                      <div className="p-6 flex-1">
                        <h3 className="font-bold text-xl mb-2 group-hover:underline" style={{ color: primaryColor }}>
                          {v.year} {v.make} {v.model}
                        </h3>
                        <p className="text-2xl font-bold mb-4" style={{ color: primaryColor }}>
                          {v.currency} {v.price.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600 mb-2">
                          Millaje: {(v.mileage ?? 0).toLocaleString()}{' '}
                          {(v.mileage ?? 0) === 1 ? 'milla' : 'millas'}
                        </p>
                        {conditionLabel ? (
                          <p className="text-sm text-gray-600 mb-4">{conditionLabel}</p>
                        ) : null}
                      </div>
                    </Link>
                    <div className="px-6 pb-6">
                      <Link
                        href={detailHref}
                        className="block w-full text-center text-white px-4 py-2 rounded font-medium hover:opacity-90"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Ver Detalles
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {reviews.length > 0 ? (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <PublicReviewsList reviews={reviews} title="Opiniones de clientes" />
        </div>
      ) : null}

      {contactEnabled ? (
        <section className="bg-white py-16 px-4 sm:px-6" id="contact">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">
              {sections?.contact?.title || 'Contáctame'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-gray-50 rounded-lg shadow p-6 overflow-hidden">
                <ContactCardHeroHeader
                  title={hero.title}
                  subtitle={hero.subtitle}
                  primaryColor={primaryColor}
                  secondaryColor={secondaryColor}
                />
                <h3 className="text-xl font-bold mb-4">Información de Contacto</h3>
                <div className="space-y-3">
                  {contactPhone ? (
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl" aria-hidden>
                        📞
                      </span>
                      <div>
                        <p className="text-sm text-gray-600">Teléfono</p>
                        <a
                          href={`tel:${contactPhone.replace(/\s/g, '')}`}
                          className="hover:underline"
                          style={{ color: primaryColor }}
                        >
                          {contactPhone}
                        </a>
                      </div>
                    </div>
                  ) : null}
                  {contactEmail ? (
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl" aria-hidden>
                        ✉️
                      </span>
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <a href={`mailto:${contactEmail}`} className="hover:underline" style={{ color: primaryColor }}>
                          {contactEmail}
                        </a>
                      </div>
                    </div>
                  ) : null}
                  {(address.street || address.city) ? (
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl" aria-hidden>
                        📍
                      </span>
                      <div>
                        <p className="text-sm text-gray-600">Dirección</p>
                        <p className="text-gray-900">
                          {[address.street, address.city, address.state, address.zipCode]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      </div>
                    </div>
                  ) : null}
                  {businessHours ? (
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl" aria-hidden>
                        🕐
                      </span>
                      <div>
                        <p className="text-sm text-gray-600">Horarios</p>
                        <p className="text-gray-900 whitespace-pre-line">{businessHours}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
                {Object.values(socialMedia).some((v) => typeof v === 'string' && v.trim()) ? (
                  <div className="mt-6 pt-6 border-t flex flex-wrap items-center gap-x-3 gap-y-2">
                    <p className="text-sm text-gray-600 font-medium shrink-0">Síguenos en:</p>
                    <SocialMediaLinks socialMedia={socialMedia} className="gap-2" />
                  </div>
                ) : null}
              </div>

              <div className="bg-gray-50 rounded-lg shadow p-6">
                <h3 className="text-xl font-bold mb-4">Envíame un Mensaje</h3>
                <div className="space-y-3">
                  {buildWaUrl('Hola, me gustaría recibir más información') ? (
                    <a
                      href={buildWaUrl('Hola, me gustaría recibir más información')!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-green-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-600 flex items-center justify-center gap-2"
                    >
                      <span aria-hidden>💬</span>
                      Escribir por WhatsApp
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setShowContactForm(true)}
                    className="w-full text-white px-6 py-3 rounded-lg font-medium hover:opacity-90"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Abrir Formulario de Contacto
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <footer className="bg-gray-900 text-white py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4">{seller.name}</h3>
              <p className="text-gray-400 text-sm">
                {bio.substring(0, 150) || 'Descripción del vendedor...'}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contacto</h4>
              <div className="space-y-2 text-sm text-gray-400">
                {contactPhone ? <p>📞 {contactPhone}</p> : null}
                {contactEmail ? <p>✉️ {contactEmail}</p> : null}
                {(address.street || address.city) ? (
                  <p>📍 {[address.street, address.city, address.state].filter(Boolean).join(', ')}</p>
                ) : null}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Enlaces</h4>
              <div className="space-y-2 text-sm">
                <button
                  type="button"
                  onClick={() => scrollToSection('inventory')}
                  className="text-gray-400 hover:text-white block text-left w-full"
                >
                  Inventario
                </button>
                <Link
                  href={catalogUrl}
                  className="text-gray-400 hover:text-white block text-sm mt-2"
                >
                  Ver catálogo completo
                </Link>
                {aboutEnabled && aboutContent ? (
                  <button
                    type="button"
                    onClick={() => scrollToSection('about')}
                    className="text-gray-400 hover:text-white block text-left w-full"
                  >
                    Sobre Mí
                  </button>
                ) : null}
                {contactEnabled ? (
                  <button
                    type="button"
                    onClick={() => scrollToSection('contact')}
                    className="text-gray-400 hover:text-white block text-left w-full"
                  >
                    Contacto
                  </button>
                ) : null}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-6 text-center text-sm text-gray-400">
            <p>
              © {new Date().getFullYear()} {seller.name}. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>

      {showContactForm ? (
        <SellerContactFormModal
          tenantId={seller.tenantId}
          sellerId={seller.id}
          sellerName={seller.name}
          onClose={() => setShowContactForm(false)}
        />
      ) : null}

      <ChatWidget
        tenantId={seller.tenantId}
        tenantName={seller.name}
        welcomeMessage={websiteSettings?.chat?.welcomeMessage}
        enabled={chatOn}
      />
    </div>
  );
}
