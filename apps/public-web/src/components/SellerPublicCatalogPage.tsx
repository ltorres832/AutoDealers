'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import PublicBackButton from '@/components/PublicBackButton';
import StarRating from '@/components/StarRating';
import PublicReviewsList, { type PublicReviewItem } from '@/components/PublicReviewsList';
import { SocialMediaLinks, type SocialMediaMap } from '@/components/SocialMediaLinks';
import ChatWidget from '@/components/ChatWidget';
import { getFirstPhoto, handleImageError } from '@/lib/vehicle-image';
import { externalWebsiteHref, normalizeMisplacedFirebaseAppHostingUrl } from '@/lib/normalize-app-hosting-url';
import { pingCatalogVehicleClick } from '@/lib/catalog-vehicle-click';
import { buildPublicVehicleDetailHref, vehicleCatalogTenantId } from '@/lib/public-vehicle-detail-href';
import PublicPromoVideo from '@/components/PublicPromoVideo';
import { PublicTrustGallery } from '@autodealers/shared/components/PublicTrustGallery';
import type { PublicTrustGalleryItem } from '@autodealers/shared/public-trust-gallery';
import { resolveBusinessHours } from '@/lib/resolve-business-hours';

interface Seller {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsapp?: string;
  website?: string;
  photo: string;
  sellerRating: number;
  sellerRatingCount: number;
  tenantId: string;
  tenantName: string;
  title: string;
  /** YouTube, Vimeo o URL HTTPS a .mp4/.webm — antes del inventario en la página pública del vendedor */
  publicPromoVideoUrl?: string;
  publicTrustGalleryPhotos?: string[];
  publicTrustGalleryItems?: PublicTrustGalleryItem[];
  socialMedia?: SocialMediaMap;
}

/** Misma estructura que `tenants/{id}.websiteSettings` (panel vendedor / subdominio). */
interface TenantWebsiteSettingsForSellerPage {
  hero?: {
    title?: string;
    subtitle?: string;
    ctaText?: string;
  };
  chat?: {
    enabled?: boolean;
    welcomeMessage?: string;
  };
}

interface Vehicle {
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
  description: string;
  status?: string;
  showSoldBadge?: boolean;
  showPublicSoldBadge?: boolean;
  specifications?: {
    transmission?: string;
    fuelType?: string;
    /** Versión / trim si no va en el campo model */
    trim?: string;
  };
}

/** Primer token si el vendedor escribió varios modelos en un solo campo (ej. "Corolla / Civic"). */
function primaryModelToken(raw: string): string {
  const s = (raw || '').trim() || 'Sin modelo';
  const first = s.split(/\s*(?:[,;/|]|\s+y\s+)\s*/i)[0]?.trim();
  return first || s;
}

/** Clave de familia: misma línea de modelo aunque cambie LX/EX, motor, etc. */
function modelFamilyKey(rawModel: string): string {
  const primary = primaryModelToken(rawModel);
  let key = primary.replace(/\s+/g, ' ').trim();
  key = key.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const TRAIL =
    /\s+(lx\+?|ex\+?|sx\+?|se|le|xl|xle|xls|limited|premium|platinum|titanium|sport|touring|ultimate|denali|overland|trailhawk|n\.?\s*line|hybrid|phev|awd|fwd|4x4|4wd|2wd|2\.0t|1\.6t|1\.5t|v6|v8|diesel|turbo|gt-line|sr5|sr|trd|max|xlr|ls|lt|rs|ss)\s*$/i;
  for (let i = 0; i < 6; i++) {
    const n = key.replace(TRAIL, '').trim();
    if (n === key) break;
    key = n;
  }
  return key.toLowerCase();
}

function variantDisplayLabel(v: Vehicle): string {
  const m = (v.model || '').trim() || 'Sin modelo';
  const specTrim = v.specifications?.trim;
  const t = typeof specTrim === 'string' ? specTrim.trim() : '';
  if (t && !m.toLowerCase().includes(t.toLowerCase())) {
    return `${m} ${t}`.replace(/\s+/g, ' ').trim();
  }
  return m;
}

function pickShortestLabel(labels: string[]): string {
  const u = [...new Set(labels.map((l) => l.trim()).filter(Boolean))];
  if (!u.length) return 'Sin modelo';
  return u.reduce((a, b) => (a.length <= b.length ? a : b));
}

interface SellerInventoryVariantGroup {
  slug: string;
  label: string;
  vehicles: Vehicle[];
}

interface SellerInventoryModelFamily {
  slug: string;
  /** Familia de modelo (p. ej. "Sportage" agrupa Sportage LX, Sportage EX…) */
  model: string;
  totalCount: number;
  variants: SellerInventoryVariantGroup[];
}

interface SellerInventoryMakeGroup {
  slug: string;
  make: string;
  models: SellerInventoryModelFamily[];
}

function groupSellerInventoryByMakeAndModel(vehicles: Vehicle[]): SellerInventoryMakeGroup[] {
  type VariantBucket = { label: string; items: Vehicle[] };
  type FamilyBucket = { byVariant: Map<string, VariantBucket> };
  type MakeBucket = { displayMake: string; byFamily: Map<string, FamilyBucket> };
  const byMakeKey = new Map<string, MakeBucket>();

  for (const v of vehicles) {
    const rawMake = (v.make || '').trim() || 'Sin marca';
    const makeKey = rawMake.toLowerCase();
    const familyKey = modelFamilyKey(v.model || '');
    const variantKey = variantDisplayLabel(v).toLowerCase();
    const variantLabel = variantDisplayLabel(v);

    let makeBucket = byMakeKey.get(makeKey);
    if (!makeBucket) {
      makeBucket = { displayMake: rawMake, byFamily: new Map() };
      byMakeKey.set(makeKey, makeBucket);
    } else if (rawMake.length > makeBucket.displayMake.length) {
      makeBucket.displayMake = rawMake;
    }

    let familyBucket = makeBucket.byFamily.get(familyKey);
    if (!familyBucket) {
      familyBucket = { byVariant: new Map() };
      makeBucket.byFamily.set(familyKey, familyBucket);
    }

    let variantBucket = familyBucket.byVariant.get(variantKey);
    if (!variantBucket) {
      variantBucket = { label: variantLabel, items: [] };
      familyBucket.byVariant.set(variantKey, variantBucket);
    } else if (variantLabel.length < variantBucket.label.length) {
      variantBucket.label = variantLabel;
    }
    variantBucket.items.push(v);
  }

  const sortVehicles = (items: Vehicle[]) =>
    [...items].sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return (b.price || 0) - (a.price || 0);
    });

  return [...byMakeKey.entries()]
    .sort(([ka], [kb]) => ka.localeCompare(kb, 'es', { sensitivity: 'base' }))
    .map(([makeKey, makeBucket]) => ({
      slug: makeKey,
      make: makeBucket.displayMake,
      models: [...makeBucket.byFamily.entries()]
        .sort(([fa], [fb]) => fa.localeCompare(fb, 'es', { sensitivity: 'base' }))
        .map(([familyKey, familyBucket]) => {
          const variants = [...familyBucket.byVariant.entries()]
            .sort(([va], [vb]) => va.localeCompare(vb, 'es', { sensitivity: 'base' }))
            .map(([vk, { label, items }]) => ({
              slug: vk,
              label,
              vehicles: sortVehicles(items),
            }));
          const allInFamily = variants.flatMap((x) => x.vehicles);
          const familyTitle = pickShortestLabel(
            allInFamily.map((x) => primaryModelToken(x.model || ''))
          );
          return {
            slug: familyKey,
            model: familyTitle,
            totalCount: allInFamily.length,
            variants,
          };
        }),
    }));
}

function SellerVehicleCard({ vehicle, seller }: { vehicle: Vehicle; seller: Seller }) {
  const showSold =
    vehicle.status === 'sold' ||
    vehicle.showSoldBadge === true ||
    vehicle.showPublicSoldBadge === true;
  const catalogTenantId = vehicleCatalogTenantId(vehicle, seller.tenantId);
  const detailHref = buildPublicVehicleDetailHref({
    vehicleId: vehicle.id,
    tenantId: catalogTenantId,
    sellerId: seller.id,
  });
  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden flex flex-col">
      <Link
        href={detailHref}
        className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-t-lg"
        onClick={() =>
          pingCatalogVehicleClick({
            vehicleId: vehicle.id,
            tenantId: catalogTenantId,
            surface: 'seller_inventory',
          })
        }
      >
        {getFirstPhoto(vehicle) ? (
          <div className="relative h-48 bg-white overflow-hidden border-b border-gray-100">
            <img
              src={getFirstPhoto(vehicle)!}
              alt={`${vehicle.make} ${vehicle.model}`}
              className={`w-full h-full object-contain object-center transition group-hover:scale-[1.02] ${
                showSold ? 'opacity-70' : ''
              }`}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={handleImageError}
            />
            {showSold ? (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-3xl font-black tracking-widest text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] border-4 border-white/90 px-4 py-1 rotate-[-8deg]">
                  SOLD
                </span>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="relative h-48 bg-white flex items-center justify-center border-b border-gray-100">
            <span className="text-6xl">🚗</span>
          </div>
        )}
        <div className="p-4 pb-2">
          <h3 className="font-bold text-lg mb-2 group-hover:text-primary-700 transition-colors">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h3>
          <p className="text-2xl font-bold text-primary-600 mb-2">
            {vehicle.currency} {vehicle.price.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 mb-2">
            Millaje: {(vehicle.mileage ?? 0).toLocaleString()}{' '}
            {(vehicle.mileage ?? 0) === 1 ? 'milla' : 'millas'}
          </p>
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{vehicle.description}</p>
          <span className="inline-flex items-center text-sm font-semibold text-primary-600 group-hover:underline">
            Ver detalle del vehículo
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </Link>
      <div className="p-4 pt-2 mt-auto border-t border-gray-100">
        <div className="flex gap-2">
          <a
            href={
              seller.whatsapp || seller.phone
                ? `https://wa.me/${(seller.whatsapp || seller.phone || '').replace(/[^0-9]/g, '')}?text=Hola, estoy interesado en el vehículo: ${vehicle.year} ${vehicle.make} ${vehicle.model} - ${vehicle.currency} ${vehicle.price.toLocaleString()}`
                : '#'
            }
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (!seller.whatsapp && !seller.phone) {
                e.preventDefault();
                alert('Número de WhatsApp no disponible');
              }
            }}
            className={`flex-1 px-4 py-2 rounded font-medium text-sm text-center flex items-center justify-center gap-1 ${
              seller.whatsapp || seller.phone
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-400 text-white cursor-not-allowed opacity-50'
            }`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            WhatsApp
          </a>
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('openChat', { detail: { vehicleId: vehicle.id } }));
            }}
            className="flex-1 bg-gradient-to-r from-primary-600 to-brand-red-bright600 text-white px-4 py-2 rounded hover:from-primary-700 hover:to-brand-red-bright700 font-medium text-sm flex items-center justify-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Chat
          </button>
          {seller.email ? (
            <button
              type="button"
              onClick={() => {
                window.location.href = `mailto:${seller.email}?subject=Consulta sobre ${vehicle.year} ${vehicle.make} ${vehicle.model}`;
              }}
              className="flex-1 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 font-medium text-sm flex items-center justify-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Catálogo morado del vendedor (misma UI que /seller/{id}). */
export default function SellerPublicCatalogPage({
  sellerId,
  /**
   * `true` = web propia del vendedor (`/seller/{id}`, subdominio): sin «Volver» ni «Ir al inicio».
   * `false` = catálogo embebido en el marketplace (solo si hay sitio principal detrás).
   */
  standaloneSellerSite = true,
}: {
  sellerId: string;
  standaloneSellerSite?: boolean;
}) {
  const [seller, setSeller] = useState<Seller | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [reviews, setReviews] = useState<PublicReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [websiteSettings, setWebsiteSettings] = useState<TenantWebsiteSettingsForSellerPage | null>(null);
  const [businessHours, setBusinessHours] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [profileDescription, setProfileDescription] = useState('');

  const inventoryByMakeModel = useMemo(
    () => groupSellerInventoryByMakeAndModel(vehicles),
    [vehicles]
  );

  const displayRating = useMemo(() => {
    if (reviews.length > 0) {
      const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
      return { rating: sum / reviews.length, count: reviews.length };
    }
    if (seller && seller.sellerRatingCount > 0) {
      return { rating: seller.sellerRating, count: seller.sellerRatingCount };
    }
    return { rating: seller?.sellerRating ?? 0, count: seller?.sellerRatingCount ?? 0 };
  }, [seller, reviews]);

  const showProfileBio =
    profileBio.length > 0 &&
    profileBio !== profileDescription;
  const showAboutSection = profileDescription.length > 0 || (profileBio.length > 0 && !profileDescription);

  useEffect(() => {
    if (sellerId) {
      console.log(`🔄 useEffect triggered for sellerId: ${sellerId}`);
      fetchSellerData();
    } else {
      console.warn('⚠️ No sellerId in params');
      setLoading(false);
    }
  }, [sellerId]);

  async function fetchSellerData() {
    try {
      setLoading(true);
      console.log(`🔍 Fetching seller data for ID: ${sellerId}`);
      
      // Agregar timeout de 20 segundos (reducido)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.error('⏱️ Request timeout after 20 seconds');
        controller.abort();
      }, 20000);
      
      try {
        console.log(`📡 Making fetch request to /api/public/seller/${sellerId}`);
        const response = await fetch(`/api/public/seller/${sellerId}`, {
          signal: controller.signal,
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        clearTimeout(timeoutId);
        
        console.log(`📡 Response received: status=${response.status}, ok=${response.ok}`);
        
        console.log(`📡 Response status: ${response.status}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText || 'Error desconocido' };
          }
          console.error('❌ Error response:', errorData);
          alert(`Error al cargar los datos: ${errorData.error || 'Error desconocido'}`);
          return;
        }
        
        const data = await response.json();
        console.log(`✅ Seller data received:`, {
          seller: data.seller?.name,
          vehiclesCount: data.vehicles?.length || 0,
          vehicles: data.vehicles?.slice(0, 3).map((v: any) => ({
            id: v.id,
            make: v.make,
            model: v.model,
            status: v.status,
            sellerId: v.sellerId,
          })),
        });
        
        if (!data.seller) {
          console.error('❌ No seller data in response');
          alert('Error: No se encontraron datos del vendedor');
          return;
        }
        
        setSeller({
          ...data.seller,
          socialMedia:
            data.seller.socialMedia && typeof data.seller.socialMedia === 'object'
              ? data.seller.socialMedia
              : undefined,
        });
        setVehicles(data.vehicles || []);
        setReviews(Array.isArray(data.reviews) ? data.reviews : []);
        setWebsiteSettings(
          data.websiteSettings && typeof data.websiteSettings === 'object'
            ? (data.websiteSettings as TenantWebsiteSettingsForSellerPage)
            : null
        );
        setBusinessHours(
          resolveBusinessHours(
            data.profile?.businessHours,
            data.seller?.businessHours
          )
        );
        setProfileBio(typeof data.profile?.bio === 'string' ? data.profile.bio.trim() : '');
        setProfileDescription(
          typeof data.profile?.description === 'string'
            ? data.profile.description.trim()
            : typeof data.profile?.aboutText === 'string'
              ? data.profile.aboutText.trim()
              : ''
        );
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.error('❌ Request timeout');
          alert('La solicitud tardó demasiado. Por favor, intenta de nuevo.');
        } else {
          throw fetchError;
        }
      }
    } catch (error: any) {
      console.error('❌ Error fetching seller data:', error);
      alert(`Error al cargar los datos del vendedor: ${error.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Vendedor no encontrado</h1>
          {!standaloneSellerSite ? (
            <>
              <PublicBackButton className="text-primary-600 hover:underline font-medium">
                ← Volver
              </PublicBackButton>
              <span className="mx-2 text-gray-300">|</span>
              <Link href="/" className="text-primary-600 hover:underline font-medium">
                Ir al inicio
              </Link>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      {!standaloneSellerSite ? (
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center gap-3">
            <PublicBackButton className="text-gray-700 hover:text-gray-900 hover:underline flex items-center gap-1 font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Volver
            </PublicBackButton>
            <span className="text-gray-300 hidden sm:inline">|</span>
            <Link href="/" className="text-sm text-gray-500 hover:text-primary-600">
              Ir al inicio
            </Link>
          </div>
        </nav>
      ) : null}

      {websiteSettings?.hero?.title ? (
        <section
          className="text-white py-14 px-4"
          style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #b80500 45%, #be185d 100%)',
          }}
        >
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-4 break-words whitespace-normal px-2">
              {websiteSettings.hero.title}
            </h1>
            {websiteSettings.hero.subtitle ? (
              <p className="text-lg md:text-xl text-white/90 mb-8 break-words whitespace-normal px-2">
                {websiteSettings.hero.subtitle}
              </p>
            ) : null}
            {websiteSettings.hero.ctaText ? (
              <button
                type="button"
                onClick={() =>
                  document.getElementById('seller-inventory')?.scrollIntoView({ behavior: 'smooth' })
                }
                className="bg-white text-primary-700 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100"
              >
                {websiteSettings.hero.ctaText}
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Perfil del Vendedor */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Foto */}
            <div className="w-32 h-32 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden">
              {seller.photo && seller.photo.trim() !== '' ? (
                <img
                  src={seller.photo}
                  alt={seller.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Si la imagen falla al cargar, mostrar inicial
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      const fallback = document.createElement('span');
                      fallback.className = 'text-4xl text-primary-600';
                      fallback.textContent = seller.name.charAt(0).toUpperCase();
                      parent.appendChild(fallback);
                    }
                  }}
                />
              ) : (
                <span className="text-4xl text-primary-600">
                  {seller.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Información */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold mb-2">{seller.name}</h1>
              <p className="text-lg text-gray-600 mb-2">{seller.title || 'Vendedor'}</p>
              {showProfileBio ? (
                <p className="text-base text-gray-700 mb-4 italic leading-relaxed">{profileBio}</p>
              ) : null}

              {/* Información de contacto */}
              <div className="space-y-3 text-sm">
                {/* Email - Siempre visible */}
                <div className="flex items-center gap-2 text-gray-700">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {seller.email ? (
                    <a href={`mailto:${seller.email}`} className="text-primary-600 hover:text-primary-800 hover:underline">
                      {seller.email}
                    </a>
                  ) : (
                    <span className="text-gray-400">No disponible</span>
                  )}
                </div>
                
                {/* WhatsApp - Usar whatsapp o phone como fallback */}
                {(seller.whatsapp || seller.phone) && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    <a 
                      href={`https://wa.me/${(seller.whatsapp || seller.phone || '').replace(/[^0-9]/g, '')}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-green-600 hover:text-green-800 hover:underline"
                    >
                      {seller.whatsapp || seller.phone}
                    </a>
                  </div>
                )}
                
                {/* Website - Siempre visible */}
                <div className="flex items-center gap-2 text-gray-700">
                  <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  {seller.website ? (
                    <a 
                      href={externalWebsiteHref(seller.website)}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-800 hover:underline"
                    >
                      {normalizeMisplacedFirebaseAppHostingUrl(seller.website).replace(/^https?:\/\//, '')}
                    </a>
                  ) : (
                    <span className="text-gray-400">No disponible</span>
                  )}
                </div>

                {businessHours ? (
                  <div className="flex items-start gap-2 text-gray-700">
                    <svg
                      className="w-5 h-5 text-gray-500 shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Horario de atención</p>
                      <p className="text-gray-800 whitespace-pre-line leading-snug">{businessHours}</p>
                    </div>
                  </div>
                ) : null}
              </div>

              {seller.socialMedia &&
              Object.values(seller.socialMedia).some((v) => typeof v === 'string' && v.trim()) ? (
                <div className="mt-5 pt-4 border-t border-gray-100">
                  <p className="text-sm font-semibold text-gray-800 mb-3">Redes sociales</p>
                  <SocialMediaLinks socialMedia={seller.socialMedia} iconClassName="w-7 h-7" />
                </div>
              ) : null}

              <div className="mt-4">
                {displayRating.count > 0 && displayRating.rating > 0 ? (
                  <StarRating
                    rating={displayRating.rating}
                    count={displayRating.count}
                    size="lg"
                    showCount={true}
                  />
                ) : (
                  <div className="flex items-center gap-2 text-gray-500 justify-center md:justify-start">
                    <span className="text-sm">Sin calificaciones aún</span>
                  </div>
                )}
              </div>
            </div>

            {/* Botones de contacto */}
            <div className="flex flex-col gap-3">
              <a
                href={(seller.whatsapp || seller.phone) ? `https://wa.me/${(seller.whatsapp || seller.phone || '').replace(/[^0-9]/g, '')}?text=Hola, estoy interesado en tus vehículos` : '#'}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (!seller.whatsapp && !seller.phone) {
                    e.preventDefault();
                    alert('Número de WhatsApp no disponible');
                  }
                }}
                className={`px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all transform hover:scale-105 ${
                  (seller.whatsapp || seller.phone)
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-400 text-white cursor-not-allowed opacity-50'
                }`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                WhatsApp
              </a>
              <button
                onClick={() => {
                  // Disparar evento para abrir el chat
                  window.dispatchEvent(new CustomEvent('openChat'));
                }}
                className="bg-gradient-to-r from-primary-600 to-brand-red-bright600 text-white px-6 py-3 rounded-lg hover:from-primary-700 hover:to-brand-red-bright700 font-medium flex items-center justify-center gap-2 transition-all transform hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Chatear Ahora
              </button>
              {seller.email && (
                <button
                  onClick={() => {
                    window.location.href = `mailto:${seller.email}?subject=Consulta sobre vehículos`;
                  }}
                  className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 font-medium flex items-center justify-center gap-2 transition-all transform hover:scale-105"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Email
                </button>
              )}
            </div>
          </div>
        </div>

        {showAboutSection ? (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold mb-4">Sobre mí</h2>
            {profileDescription ? (
              <p className="text-gray-700 whitespace-pre-line leading-relaxed">{profileDescription}</p>
            ) : (
              <p className="text-gray-700 whitespace-pre-line leading-relaxed">{profileBio}</p>
            )}
          </div>
        ) : null}

        <PublicPromoVideo
          url={seller.publicPromoVideoUrl}
          title={`Video — ${seller.name}`}
          className="mb-10"
        />

        <div className="mb-10">
          <PublicTrustGallery items={seller.publicTrustGalleryItems || seller.publicTrustGalleryPhotos || []} />
        </div>

        <PublicReviewsList
          reviews={reviews}
          title="Opiniones de clientes"
          className="mb-8"
        />

        {/* Vehículos Publicados */}
        <div id="seller-inventory">
          <h2 className="text-2xl font-bold mb-6">
            Vehículos Disponibles ({vehicles.length})
          </h2>

          {vehicles.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-600">Este vendedor no tiene vehículos publicados aún.</p>
            </div>
          ) : (
            <div className="space-y-12">
              <p className="text-sm text-gray-500 -mt-2 mb-2">
                Por marca y familia de modelo (versiones LX/EX, etc. van juntas). Si hay varias versiones, aparecen en
                subsecciones. Orden: año más reciente primero.
              </p>
              {inventoryByMakeModel.map((makeGroup) => (
                <section
                  key={makeGroup.slug}
                  className="scroll-mt-24"
                  id={`marca-${makeGroup.slug.replace(/[^a-z0-9]+/g, '-')}`}
                >
                  <h3 className="text-2xl font-bold text-gray-900 border-b-2 border-primary-200 pb-2 mb-6">
                    {makeGroup.make}
                  </h3>
                  <div className="space-y-10">
                    {makeGroup.models.map((modelGroup) => (
                      <div key={`${makeGroup.slug}::${modelGroup.slug}`}>
                        <h4 className="text-lg font-semibold text-primary-900 mb-4 flex flex-wrap items-baseline gap-2">
                          <span>{modelGroup.model}</span>
                          <span className="text-sm font-normal text-gray-500">
                            ({modelGroup.totalCount}{' '}
                            {modelGroup.totalCount === 1 ? 'unidad' : 'unidades'})
                          </span>
                        </h4>
                        {modelGroup.variants.length > 1 ? (
                          <div className="space-y-8">
                            {modelGroup.variants.map((variant) => (
                              <div key={variant.slug}>
                                <h5 className="text-base font-medium text-gray-800 mb-3 pl-3 border-l-4 border-primary-300">
                                  {variant.label}
                                  <span className="text-gray-500 font-normal text-sm ml-2">
                                    ({variant.vehicles.length}{' '}
                                    {variant.vehicles.length === 1 ? 'unidad' : 'unidades'})
                                  </span>
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                  {variant.vehicles.map((vehicle) => (
                                    <SellerVehicleCard key={vehicle.id} vehicle={vehicle} seller={seller} />
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {(modelGroup.variants[0]?.vehicles || []).map((vehicle) => (
                              <SellerVehicleCard key={vehicle.id} vehicle={vehicle} seller={seller} />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Widget */}
      {seller.tenantId && seller.name && (
        <ChatWidget
          tenantId={seller.tenantId}
          tenantName={seller.name}
          welcomeMessage={websiteSettings?.chat?.welcomeMessage}
          enabled={websiteSettings?.chat?.enabled !== false}
        />
      )}
    </div>
  );
}

