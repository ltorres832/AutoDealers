'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ChatWidget from '../../components/ChatWidget';
import VehicleDetailModal from './VehicleDetailModal';
import { getFirstPhoto, handleImageError } from '../../lib/vehicle-image';
import VehicleCategories from '../../components/VehicleCategories';
import HeroBanner from '../../components/HeroBanner';
import SidebarBanner from '../../components/SidebarBanner';
import SponsoredContent from '../../components/SponsoredContent';
import BetweenContentBanner from '../../components/BetweenContentBanner';
import PublicPromoVideo from '../../components/PublicPromoVideo';
import { SocialMediaLinks } from '@/components/SocialMediaLinks';
import { getPublicVehicleConditionLabel } from '@/lib/vehicle-condition-label';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  currency: string;
  photos?: string[];
  images?: string[];
  description: string;
  mileage?: number;
  condition: string;
  bodyType?: string;
  specifications?: {
    engine?: string;
    transmission?: string;
    fuelType?: string;
    color?: string;
    doors?: number;
    seats?: number;
    bodyType?: string;
  };
}

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  branding: {
    primaryColor: string;
    secondaryColor: string;
    logo?: string;
  };
  contactEmail?: string;
  contactPhone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  website?: string;
  description?: string;
  businessHours?: string;
  sellerInfo?: {
    id: string;
    name: string;
    photo?: string;
    bio?: string;
  };
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    linkedin?: string;
  };
  websiteSettings?: {
    hero?: {
      title?: string;
      subtitle?: string;
      ctaText?: string;
      /** YouTube, Vimeo o URL HTTPS a .mp4/.webm */
      promoVideoUrl?: string;
    };
    sections?: {
      about?: {
        enabled?: boolean;
        title?: string;
        content?: string;
      };
      services?: {
        enabled?: boolean;
        title?: string;
        items?: Array<{
          name: string;
          description: string;
          icon?: string;
        }>;
      };
      testimonials?: {
        enabled?: boolean;
        title?: string;
      };
      contact?: {
        enabled?: boolean;
        title?: string;
        showMap?: boolean;
      };
    };
    chat?: {
      enabled?: boolean;
      welcomeMessage?: string;
    };
  };
}

export default function TenantPublicPage() {
  const params = useParams();

  // VERIFICACIÓN INMEDIATA EN EL SERVIDOR Y CLIENTE: Si estamos en la raíz sin subdominio, NO renderizar esta página
  const [isRootCheck, setIsRootCheck] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const pathname = window.location.pathname;
      const parts = hostname.split('.');

      // Verificar si es el dominio base de Firebase o un dominio técnico de App Hosting
      const isRootDomain = hostname === 'autodealers-7f62e.web.app' ||
        hostname === 'autodealers-7f62e.firebaseapp.com' ||
        hostname === 'localhost' ||
        hostname.includes('---') || // Evitar subdominios técnicos
        hostname.includes('amplifyapp') ||
        (parts.length <= 2 && !hostname.includes('localhost:'));

      // Si es dominio raíz Y estamos en "/", esta página NO debería cargarse
      if (isRootDomain && (pathname === '/' || pathname === '')) {
        setIsRootCheck(true);
        // Redirigir inmediatamente
        window.location.replace('/');
        return;
      }
      setIsRootCheck(false);
    }
  }, []);

  // Si detectamos que estamos en la raíz sin subdominio, NO renderizar nada
  if (isRootCheck === true) {
    return null;
  }

  // Obtener subdominio de params o detectarlo desde hostname si no está en params
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMake, setSelectedMake] = useState<string>('all');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 0 });

  // Detectar subdominio desde hostname si no está en params (para subdominios dinámicos)
  useEffect(() => {
    // Si ya estamos redirigiendo, no hacer nada más
    if (shouldRedirect) return;

    // Si la URL es exactamente "/" (raíz), redirigir inmediatamente
    if (typeof window !== 'undefined' && window.location.pathname === '/') {
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      // Si es el dominio raíz (sin subdominio), NO es esta página
      const isRootDomain = hostname === 'autodealers-7f62e.web.app' ||
        hostname === 'localhost' ||
        (parts.length <= 2 && !hostname.includes('localhost:'));

      if (isRootDomain) {
        // Ya estamos en la raíz, no hacer nada (Next.js debería cargar page.tsx, no esta)
        // Pero si esta página se carga de todos modos, forzar redirección
        setShouldRedirect(true);
        window.location.replace('/');
        return;
      }
    }

    let detectedSubdomain: string | null = null;

    // Primero intentar desde params (pero solo si tiene valor válido)
    const rawSub = params?.subdomain;
    const paramSubdomain = Array.isArray(rawSub) ? rawSub[0] : rawSub;
    // Ignorar subdominios técnicos de Firebase App Hosting (ej: t-1593654656---public-web-app-obn2bwb27a-uc)
    const isTechnicalSubdomain =
      typeof paramSubdomain === 'string' &&
      paramSubdomain.length > 0 &&
      (paramSubdomain.includes('---') || paramSubdomain.includes('public-web-app') || paramSubdomain.startsWith('t-'));

    if (paramSubdomain && typeof paramSubdomain === 'string' && paramSubdomain.trim() !== '' && paramSubdomain !== 'undefined' && !isTechnicalSubdomain) {
      detectedSubdomain = paramSubdomain;
    } else {
      // Si no está en params, detectar desde hostname (cliente)
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const parts = hostname.split('.');
        const fixedSubdomains = ['admin', 'dealers', 'sellers', 'ads', 'www'];

        if (hostname.includes('---') || hostname.includes('amplifyapp') || hostname.includes('us-central1.hosted.app')) {
          detectedSubdomain = null;
        } else if (hostname.includes('localhost')) {
          const localhostParts = hostname.split(':');
          if (localhostParts[0] !== 'localhost' && localhostParts[0] !== 'www') {
            detectedSubdomain = localhostParts[0];
          }
        } else if (parts.length >= 3) {
          const sub = parts[0];
          if (!fixedSubdomains.includes(sub.toLowerCase()) && !sub.includes('---')) {
            detectedSubdomain = sub;
          }
        }
      }
    }

    if (detectedSubdomain) {
      setSubdomain(detectedSubdomain);
    } else if (isTechnicalSubdomain && typeof window !== 'undefined') {
      // Subdominio técnico de App Hosting: redirigir a la página principal
      window.location.replace('/');
    }
  }, [params]);

  useEffect(() => {
    // Si no hay subdominio detectado y no está en params, redirigir a la página raíz
    if (!subdomain && (!params?.subdomain || params.subdomain === 'undefined')) {
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        // Solo redirigir si estamos en el dominio raíz (sin subdominio real)
        const parts = hostname.split('.');
        const isRootDomain = hostname === 'autodealers-7f62e.web.app' ||
          hostname === 'localhost' ||
          (parts.length <= 2 && !hostname.includes('localhost'));

        if (isRootDomain) {
          // Redirigir a la página raíz
          window.location.href = '/';
          return;
        }
      }
      // Si no se puede redirigir, mostrar error después de un momento
      setTimeout(() => {
        if (!subdomain) {
          setError('No se detectó un subdominio. Por favor, accede usando un subdominio válido (ej: demo.autodealers-7f62e.web.app) o visita la página principal.');
          setLoading(false);
        }
      }, 1000);
      return;
    }

    if (subdomain) {
      fetchTenantData();
    }
  }, [subdomain, params]);

  useEffect(() => {
    filterVehicles();

    // Calcular rango de precios
    if (vehicles.length > 0) {
      const prices = vehicles.map(v => v.price);
      setPriceRange({
        min: Math.min(...prices),
        max: Math.max(...prices),
      });
    }
  }, [vehicles, searchTerm, selectedMake]);

  useEffect(() => {
    // Manejar scroll para mostrar botón "volver arriba"
    function handleScroll() {
      setShowScrollTop(window.scrollY > 300);
    }
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  async function fetchTenantData() {
    if (!subdomain) {
      setError('No se pudo detectar el subdominio');
      setLoading(false);
      return;
    }

    const subdomainStr = subdomain;

    try {
      setLoading(true);
      console.log(`🌐 Fetching tenant data for subdomain: "${subdomainStr}"`);
      if (typeof window !== 'undefined') {
        console.log(`📍 Current URL: ${window.location.href}`);
      }
      console.log(`🔗 API endpoint: /api/tenant/${subdomainStr}`);

      // Agregar timeout para evitar cargas infinitas
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos

      const response = await fetch(`/api/tenant/${subdomainStr}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 404) {
          // Si es 404 y es 'demo', intentar crear el tenant
          if (subdomainStr === 'demo') {
            console.log('Demo tenant not found, attempting to create...');
            // Esperar un momento y reintentar
            await new Promise(resolve => setTimeout(resolve, 1000));
            fetchTenantData();
            return;
          }
        }
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log('📦 Tenant data received:', {
        hasTenant: !!data.tenant,
        tenantId: data.tenant?.id,
        tenantName: data.tenant?.name,
        vehiclesCount: data.vehicles?.length || 0,
        vehicles: data.vehicles?.map((v: any) => ({
          id: v.id,
          make: v.make,
          model: v.model,
          year: v.year,
          status: v.status,
        })) || [],
      });

      if (!data.tenant) {
        throw new Error('Tenant data is missing');
      }

      setTenant(data.tenant);
      const vehiclesList = data.vehicles || [];
      console.log(`✅ Estableciendo ${vehiclesList.length} vehículos en el estado`);
      console.log(`📋 Primeros 3 vehículos a establecer:`, vehiclesList.slice(0, 3).map((v: any) => ({
        id: v.id,
        make: v.make,
        model: v.model,
        year: v.year,
        price: v.price,
        hasPhotos: v.photos?.length > 0,
      })));

      if (vehiclesList.length === 0) {
        console.warn('⚠️ NO SE RECIBIERON VEHÍCULOS DEL API');
        console.log('📦 Respuesta completa del API:', {
          hasTenant: !!data.tenant,
          tenantId: data.tenant?.id,
          vehiclesArray: data.vehicles,
          vehiclesType: typeof data.vehicles,
          vehiclesIsArray: Array.isArray(data.vehicles),
        });
      }

      setVehicles(vehiclesList);
      setFilteredVehicles(vehiclesList);
    } catch (error: any) {
      console.error('Error fetching tenant data:', error);
      if (error.name === 'AbortError') {
        setError('La solicitud tardó demasiado. Por favor, intenta nuevamente.');
      } else {
        setError(error.message || 'Error al cargar los datos del concesionario');
      }
    } finally {
      setLoading(false);
    }
  }

  function filterVehicles() {
    let filtered = [...vehicles];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.make.toLowerCase().includes(term) ||
          v.model.toLowerCase().includes(term) ||
          v.description.toLowerCase().includes(term) ||
          `${v.year}`.includes(term)
      );
    }

    if (selectedMake !== 'all') {
      filtered = filtered.filter((v) => v.make === selectedMake);
    }

    setFilteredVehicles(filtered);
  }

  const uniqueMakes = Array.from(new Set(vehicles.map((v) => v.make))).sort();

  // VERIFICACIÓN CRÍTICA: Si estamos en la raíz sin subdominio, redirigir
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const pathname = window.location.pathname;
      const parts = hostname.split('.');

      const isRootDomain = hostname === 'autodealers-7f62e.web.app' ||
        hostname === 'localhost' ||
        (parts.length <= 2 && !hostname.includes('localhost:'));

      // Si es dominio raíz en "/" y no hay subdominio válido, redirigir
      if (isRootDomain && (pathname === '/' || pathname === '') && !subdomain) {
        setShouldRedirect(true);
        window.location.replace('/');
        return;
      }
    }
  }, [subdomain]);

  // Si debe redirigir, mostrar mensaje mínimo
  if (shouldRedirect) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    // Solo mostrar loading si tenemos subdominio válido O si todavía estamos detectando
    // No mostrar "Cargando datos del concesionario" si no hay subdominio
    if (!subdomain && typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      const isRootDomain = hostname === 'autodealers-7f62e.web.app' ||
        hostname === 'localhost' ||
        (parts.length <= 2 && !hostname.includes('localhost:'));

      if (isRootDomain && window.location.pathname === '/') {
        // No mostrar loading en la raíz sin subdominio
        return null;
      }
    }

    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando datos del concesionario...</p>
        </div>
      </div>
    );
  }

  // Subdominio técnico de App Hosting (ej: t-1593654656---public-web-app-xxx): redirigir, no mostrar error
  const paramSub = params?.subdomain;
  const isTechSub = paramSub && (String(paramSub).includes('---') || String(paramSub).includes('public-web-app') || String(paramSub).startsWith('t-'));
  if (isTechSub) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 p-4">
        <div className="text-center max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Tenant no encontrado</h1>
          <p className="text-gray-600 mb-6">
            {error || 'El subdominio no existe o está inactivo'}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Subdominio: <code className="bg-gray-100 px-2 py-1 rounded">{subdomain}</code>
          </p>
          {subdomain && subdomain === 'demo' && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-4">
                El tenant demo debería crearse automáticamente. Si el problema persiste:
              </p>
              <ul className="text-left text-sm text-gray-600 space-y-2 mb-4">
                <li>• Verifica que Firebase esté configurado correctamente</li>
                <li>• Revisa la consola del servidor para errores</li>
                <li>• Intenta recargar la página</li>
              </ul>
              <button
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  fetchTenantData();
                }}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700"
              >
                Reintentar
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header
        className="bg-white shadow sticky top-0 z-40"
        style={{
          backgroundColor: tenant.branding.primaryColor || '#2563EB',
        }}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              {tenant.branding.logo && (
                <img
                  src={tenant.branding.logo}
                  alt={tenant.name}
                  className="h-12 w-auto"
                />
              )}
              <div>
                <h1 className="text-2xl font-bold text-white">{tenant.name}</h1>
                <p className="text-white/80 text-sm">
                  {tenant.description
                    ? tenant.description.substring(0, 50) + (tenant.description.length > 50 ? '...' : '')
                    : 'Tu concesionario de confianza'}
                </p>
              </div>
            </div>
            <nav className="hidden md:flex gap-4 items-center">
              <a href="#inventory" className="text-white hover:text-white/80 font-medium">
                Inventario
              </a>
              <a href="#reviews" className="text-white hover:text-white/80 font-medium">
                Reseñas
              </a>
              <a href="#social" className="text-white hover:text-white/80 font-medium">
                Redes Sociales
              </a>
              <a href="#contact" className="text-white hover:text-white/80 font-medium">
                Contacto
              </a>
              <Link
                href={`/${subdomain}/appointment`}
                className="text-white hover:text-white/80 font-medium"
              >
                Agendar Cita
              </Link>
            </nav>
            <div className="flex gap-3">
              {tenant.contactPhone && (
                <a
                  href={`https://wa.me/${tenant.contactPhone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-600 flex items-center gap-2 text-sm"
                >
                  <span>💬</span>
                  WhatsApp
                </a>
              )}
              <button
                onClick={() => setShowContactForm(true)}
                className="bg-white text-primary-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 text-sm"
              >
                Contactar
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Banner - Above main content - UPDATED 2025-01-04 */}
      <div className="container mx-auto px-4 py-4">
        <HeroBanner />
      </div>

      {/* Hero Section */}
      <section
        className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-20 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${tenant.branding.primaryColor || '#2563EB'} 0%, ${tenant.branding.secondaryColor || '#1E40AF'} 100%)`
        }}
      >
        {/* Decorative Elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/2 translate-y-1/2"></div>
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 animate-fade-in max-w-4xl mx-auto break-words whitespace-normal px-2">
            {tenant.websiteSettings?.hero?.title || 'Encuentra el vehículo perfecto para ti'}
          </h2>
          <p className="text-xl mb-8 text-white/90 max-w-3xl mx-auto break-words whitespace-normal px-2">
            {tenant.websiteSettings?.hero?.subtitle || `Tenemos ${vehicles.length} vehículos disponibles para ti`}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {tenant.websiteSettings?.hero?.ctaText && (
              <button
                onClick={() => {
                  document.getElementById('inventory')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-white text-primary-600 px-8 py-4 rounded-lg font-bold hover:bg-gray-100 text-lg transition shadow-lg hover:shadow-xl"
              >
                {tenant.websiteSettings.hero.ctaText}
              </button>
            )}
            <Link
              href={subdomain ? `/${subdomain}/pre-qualify` : '#'}
              className="bg-green-600 text-white px-8 py-4 rounded-lg font-bold hover:bg-green-700 text-lg transition shadow-lg hover:shadow-xl"
            >
              🚗 Pre-Cualificación Gratis
            </Link>
            <Link
              href={`/${subdomain}/appointment`}
              className="bg-white/20 backdrop-blur text-white px-8 py-4 rounded-lg font-bold hover:bg-white/30 text-lg border-2 border-white/50 transition"
            >
              📅 Agendar Cita
            </Link>
          </div>
        </div>
      </section>

      {/* Seller Profile Section */}
      {tenant.sellerInfo && tenant.sellerInfo.name && (
        <section id="seller" className="bg-white py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-8 text-center">Conoce a tu Vendedor</h2>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 shadow-lg">
                {tenant.sellerInfo.photo ? (
                  <div className="relative">
                    <img
                      src={tenant.sellerInfo.photo}
                      alt={tenant.sellerInfo.name}
                      className="w-48 h-48 rounded-full object-cover border-4 border-white shadow-xl"
                      onError={(e) => {
                        // Si la imagen falla, mostrar placeholder
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <div className="w-48 h-48 rounded-full bg-primary-600 hidden items-center justify-center text-6xl text-white border-4 border-white shadow-xl">
                      {tenant.sellerInfo.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                ) : (
                  <div className="w-48 h-48 rounded-full bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center text-6xl text-white border-4 border-white shadow-xl font-bold">
                    {tenant.sellerInfo.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-3xl font-bold mb-3 text-gray-900">{tenant.sellerInfo.name}</h3>
                  {tenant.sellerInfo.bio ? (
                    <p className="text-gray-700 text-lg leading-relaxed mb-6">
                      {tenant.sellerInfo.bio}
                    </p>
                  ) : (
                    <p className="text-gray-500 italic mb-6">
                      Experto en ayudarte a encontrar el vehículo perfecto para ti.
                    </p>
                  )}
                  <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                    <Link
                      href={`/${subdomain}/appointment`}
                      className="inline-block bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700 font-medium transition shadow-lg hover:shadow-xl text-center"
                    >
                      📅 Agendar una Cita
                    </Link>
                    <Link
                      href={subdomain ? `/${subdomain}/pre-qualify` : '#'}
                      className="inline-block bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-medium transition shadow-lg hover:shadow-xl text-center"
                    >
                      🚗 Pre-Cualificación
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* About Section */}
      {tenant.websiteSettings?.sections?.about?.enabled && tenant.websiteSettings.sections.about.content && (
        <section id="about" className="bg-white py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-6 text-center">
              {tenant.websiteSettings.sections.about.title || 'Sobre Nosotros'}
            </h2>
            <div className="max-w-3xl mx-auto">
              <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-line">
                {tenant.websiteSettings.sections.about.content}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Services Section */}
      {tenant.websiteSettings?.sections?.services?.enabled && tenant.websiteSettings.sections.services.items && tenant.websiteSettings.sections.services.items.length > 0 && (
        <section id="services" className="bg-gray-50 py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8 text-center">
              {tenant.websiteSettings.sections.services.title || 'Nuestros Servicios'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {tenant.websiteSettings.sections.services.items.map((service, index) => (
                <div key={index} className="bg-white rounded-lg shadow p-6">
                  {service.icon && (
                    <div className="text-4xl mb-4">{service.icon}</div>
                  )}
                  <h3 className="text-xl font-bold mb-2">{service.name}</h3>
                  <p className="text-gray-600">{service.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Vehicle Categories Section */}
      {vehicles.length > 0 && (
        <VehicleCategories
          vehicleCounts={(() => {
            const counts: Record<string, number> = {};
            const debugInfo: any[] = [];

            // IDs válidos de categorías (de VEHICLE_TYPES)
            const validCategoryIds = [
              'suv', 'sedan', 'pickup-truck', 'coupe', 'hatchback',
              'wagon', 'convertible', 'minivan', 'van', 'luxury',
              'crossover', 'electric', 'hybrid', 'plug-in-hybrid'
            ];

            vehicles.forEach((v: any) => {
              // Obtener bodyType de cualquier lugar
              let bodyType = v.bodyType || v.specifications?.bodyType;

              if (bodyType) {
                // Normalizar: convertir a minúsculas y quitar espacios
                const normalizedBodyType = String(bodyType).toLowerCase().trim();

                // Mapear variaciones comunes a los IDs correctos
                const bodyTypeMap: Record<string, string> = {
                  'pickup truck': 'pickup-truck',
                  'pickup': 'pickup-truck',
                  'pick-up': 'pickup-truck',
                  'pick_up': 'pickup-truck',
                  'plug-in hybrid': 'plug-in-hybrid',
                  'plugin hybrid': 'plug-in-hybrid',
                  'plug_in_hybrid': 'plug-in-hybrid',
                  'plug in hybrid': 'plug-in-hybrid',
                };

                // Aplicar mapeo si existe
                const mappedBodyType = bodyTypeMap[normalizedBodyType] || normalizedBodyType;

                // Solo contar si es un ID válido
                if (validCategoryIds.includes(mappedBodyType)) {
                  counts[mappedBodyType] = (counts[mappedBodyType] || 0) + 1;
                } else {
                  // Si no coincide, intentar buscar coincidencia parcial
                  const matchedId = validCategoryIds.find(id =>
                    normalizedBodyType.includes(id) || id.includes(normalizedBodyType)
                  );
                  if (matchedId) {
                    counts[matchedId] = (counts[matchedId] || 0) + 1;
                  } else {
                    // Debug: bodyType no reconocido
                    if (debugInfo.length < 10) {
                      debugInfo.push({
                        id: v.id,
                        make: v.make,
                        model: v.model,
                        originalBodyType: bodyType,
                        normalized: normalizedBodyType,
                        mapped: mappedBodyType,
                        status: 'NO RECONOCIDO',
                      });
                    }
                  }
                }

                // Debug: primeros 5 vehículos con bodyType válido
                if (debugInfo.length < 5 && validCategoryIds.includes(mappedBodyType)) {
                  debugInfo.push({
                    id: v.id,
                    make: v.make,
                    model: v.model,
                    bodyType: bodyType,
                    normalized: normalizedBodyType,
                    mapped: mappedBodyType,
                    source: v.bodyType ? 'nivel superior' : 'specifications',
                    status: 'OK',
                  });
                }
              } else {
                // Debug: vehículos sin bodyType
                if (debugInfo.length < 5) {
                  debugInfo.push({
                    id: v.id,
                    make: v.make,
                    model: v.model,
                    bodyType: 'NO TIENE',
                    v_bodyType: v.bodyType,
                    v_specifications_bodyType: v.specifications?.bodyType,
                    status: 'SIN BODYTYPE',
                  });
                }
              }
            });

            console.log('📊 Conteos de tipos de vehículos en frontend:', counts);
            console.log('🔍 Debug info:', debugInfo);
            console.log(`⚠️ Total vehículos: ${vehicles.length}, Con bodyType válido: ${Object.values(counts).reduce((a, b) => a + b, 0)}, Sin bodyType o no reconocido: ${vehicles.length - Object.values(counts).reduce((a, b) => a + b, 0)}`);
            console.log('📋 IDs de categorías válidos:', validCategoryIds);

            return counts;
          })()}
        />
      )}

      {/* Social Media Posts Section */}
      {tenant && <SocialPostsSection subdomain={subdomain} tenant={tenant} />}

      {/* Sponsored Content Section */}
      <SponsoredContent />

      {/* Between Content Banner - UPDATED 2025-01-04 */}
      <div className="container mx-auto px-4">
        <BetweenContentBanner />
      </div>

      <PublicPromoVideo
        url={tenant.websiteSettings?.hero?.promoVideoUrl}
        title={`Video — ${tenant.name}`}
        className="container mx-auto px-4 pt-10 pb-2"
      />

      {/* Vehicles Grid - Updated to 4 columns */}
      <section id="inventory" className="container mx-auto px-4 py-12">
        <div className="mb-8 flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1">
            <h2 className="text-3xl font-bold mb-6">Nuestro Inventario</h2>

            {/* Filtros */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Buscar por marca, modelo o descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border rounded-lg px-4 py-2"
                />
              </div>
              <select
                value={selectedMake}
                onChange={(e) => setSelectedMake(e.target.value)}
                className="border rounded-lg px-4 py-2"
              >
                <option value="all">Todas las marcas</option>
                {uniqueMakes.map((make) => (
                  <option key={make} value={make}>
                    {make}
                  </option>
                ))}
              </select>
            </div>

            {filteredVehicles.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 text-lg mb-4">
                  {vehicles.length === 0
                    ? 'No hay vehículos disponibles en este momento'
                    : 'No se encontraron vehículos con los filtros seleccionados'}
                </p>
                {/* Debug info siempre visible para ayudar al usuario */}
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded text-left text-sm max-w-2xl mx-auto">
                  <p><strong>🔍 Información de Debug:</strong></p>
                  <p>Total vehículos recibidos del servidor: <strong>{vehicles.length}</strong></p>
                  <p>Vehículos después de filtrar: <strong>{filteredVehicles.length}</strong></p>
                  <p>Búsqueda actual: <strong>"{searchTerm}"</strong></p>
                  <p>Marca seleccionada: <strong>{selectedMake}</strong></p>
                  {vehicles.length > 0 ? (
                    <div className="mt-2">
                      <p><strong>✅ Vehículos recibidos (primeros 3):</strong></p>
                      <pre className="text-xs overflow-auto max-h-40 bg-white p-2 rounded border">
                        {JSON.stringify(vehicles.slice(0, 3).map((v: any) => ({
                          id: v.id,
                          make: v.make,
                          model: v.model,
                          year: v.year,
                          price: v.price,
                          status: v.status,
                          hasPhotos: v.photos?.length > 0,
                          photosCount: v.photos?.length || 0,
                        })), null, 2)}
                      </pre>
                      <p className="mt-2 text-xs text-gray-600">
                        💡 Si ves vehículos aquí pero no se muestran arriba, puede ser un problema con los filtros.
                        Intenta limpiar la búsqueda y seleccionar "Todas las marcas".
                      </p>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <p className="text-red-600"><strong>⚠️ No se recibieron vehículos del servidor</strong></p>
                      <p className="text-xs text-gray-600 mt-1">
                        Esto puede significar que:
                      </p>
                      <ul className="text-xs text-gray-600 list-disc list-inside mt-1">
                        <li>El tenant no tiene vehículos creados</li>
                        <li>Los vehículos tienen status 'sold'</li>
                        <li>Hay un problema con el endpoint /api/tenant/{subdomain}</li>
                      </ul>
                      <p className="text-xs text-gray-600 mt-2">
                        Revisa la consola del navegador (F12) para ver los logs del servidor.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <p className="text-gray-600 mb-6">
                  Mostrando {filteredVehicles.length} de {vehicles.length} vehículos
                </p>
                {/* Grid de vehículos - 4 columnas en pantallas grandes */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {filteredVehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group"
                      onClick={() => setSelectedVehicle(vehicle)}
                    >
                      {getFirstPhoto(vehicle) ? (
                        <div className="relative h-64 bg-white overflow-hidden">
                          <img
                            src={getFirstPhoto(vehicle)!}
                            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                            className="w-full h-full object-contain object-center group-hover:scale-[1.02] transition-transform duration-300"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={handleImageError}
                          />
                          {(() => {
                            const label = getPublicVehicleConditionLabel(vehicle);
                            if (!label) return null;
                            return (
                              <div className="absolute top-2 left-2">
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                                    label === 'Nuevo'
                                      ? 'bg-green-500 text-white'
                                      : label === 'Certificado'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-700 text-white'
                                  }`}
                                >
                                  {label}
                                </span>
                              </div>
                            );
                          })()}
                          {(vehicle.photos?.length || vehicle.images?.length || 0) > 1 && (
                            <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
                              +{(vehicle.photos?.length || vehicle.images?.length || 1) - 1} fotos
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="relative h-64 bg-white border border-gray-100 flex items-center justify-center">
                          <div className="text-gray-400">
                            <svg className="w-24 h-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        </div>
                      )}
                      <div className="p-6">
                        <h3 className="font-bold text-xl mb-2 group-hover:text-primary-600 transition">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </h3>
                        <p className="text-3xl font-bold text-green-600 mb-4">
                          {vehicle.currency} {vehicle.price.toLocaleString()}
                        </p>
                        <div className="flex flex-wrap gap-2 mb-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <span className="text-gray-500 font-medium">Millaje:</span>
                            <span>{(vehicle.mileage ?? 0).toLocaleString()} millas</span>
                          </span>
                          {vehicle.specifications?.transmission && (
                            <span className="flex items-center gap-1">
                              <span>⚙️</span>
                              {vehicle.specifications.transmission}
                            </span>
                          )}
                          {vehicle.specifications?.fuelType && (
                            <span className="flex items-center gap-1">
                              <span>⛽</span>
                              {vehicle.specifications.fuelType}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mb-4 line-clamp-2">
                          {vehicle.description}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVehicle(vehicle);
                            }}
                            className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition font-medium"
                          >
                            Ver Detalles
                          </button>
                          <Link
                            href={subdomain ? `/${subdomain}/appointment?vehicleId=${vehicle.id}` : '#'}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 text-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium"
                          >
                            Agendar
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Sidebar with Banners - UPDATED 2025-01-04 - Shows 2 banners stacked */}
          <aside className="lg:w-80 flex-shrink-0">
            <div className="space-y-4">
              <SidebarBanner />
            </div>
          </aside>
        </div>
      </section>

      {/* Contact Section */}
      {tenant.websiteSettings?.sections?.contact?.enabled !== false && (
        <section id="contact" className="bg-gray-100 py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8 text-center">
              {tenant.websiteSettings?.sections?.contact?.title || 'Contáctanos'}
            </h2>
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Información de Contacto */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-bold mb-4">Información de Contacto</h3>
                <div className="space-y-3">
                  {tenant.contactPhone && (
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">📞</span>
                      <div>
                        <p className="text-sm text-gray-600">Teléfono</p>
                        <a href={`tel:${tenant.contactPhone}`} className="text-primary-600 hover:underline">
                          {tenant.contactPhone}
                        </a>
                      </div>
                    </div>
                  )}
                  {tenant.contactEmail && (
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">✉️</span>
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <a href={`mailto:${tenant.contactEmail}`} className="text-primary-600 hover:underline">
                          {tenant.contactEmail}
                        </a>
                      </div>
                    </div>
                  )}
                  {tenant.address && (tenant.address.street || tenant.address.city) && (
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">📍</span>
                      <div>
                        <p className="text-sm text-gray-600">Dirección</p>
                        <p className="text-gray-900">
                          {[
                            tenant.address.street,
                            tenant.address.city,
                            tenant.address.state,
                            tenant.address.zipCode,
                            tenant.address.country
                          ].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    </div>
                  )}
                  {tenant.businessHours && (
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">🕐</span>
                      <div>
                        <p className="text-sm text-gray-600">Horarios de Atención</p>
                        <p className="text-gray-900 whitespace-pre-line">{tenant.businessHours}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Redes Sociales */}
                {tenant.socialMedia && Object.keys(tenant.socialMedia).length > 0 && (
                  <div className="mt-6 pt-6 border-t">
                    <p className="text-sm text-gray-600 mb-3">Síguenos en:</p>
                    <SocialMediaLinks socialMedia={tenant.socialMedia} />
                  </div>
                )}
              </div>

              {/* Formulario de Contacto */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-bold mb-4">Envíanos un Mensaje</h3>
                <div className="space-y-3">
                  {tenant.contactPhone && (
                    <a
                      href={`https://wa.me/${tenant.contactPhone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-green-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-600 flex items-center justify-center gap-2"
                    >
                      <span>💬</span>
                      Escribir por WhatsApp
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowContactForm(true)}
                    className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 cursor-pointer"
                  >
                    Abrir Formulario de Contacto
                  </button>
                  <Link
                    href={`/${subdomain}/appointment`}
                    className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    📅 Agendar una Cita
                  </Link>
                </div>
                {tenant.description && (
                  <div className="mt-6 pt-6 border-t">
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {tenant.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Mapa (si está habilitado) */}
            {tenant.websiteSettings?.sections?.contact?.showMap && tenant.address && (
              <div className="mt-8 bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-bold mb-4">Ubicación</h3>
                <div className="h-64 bg-gray-200 rounded flex items-center justify-center">
                  <p className="text-gray-600">
                    Mapa de Google Maps se mostrará aquí
                    <br />
                    <span className="text-sm">
                      {[
                        tenant.address.street,
                        tenant.address.city,
                        tenant.address.state,
                        tenant.address.country
                      ].filter(Boolean).join(', ')}
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Reviews Section - DESPUÉS de Contact, ANTES de Footer y ChatWidget */}
      {subdomain && <ReviewsSection subdomain={subdomain} />}

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* About */}
            <div>
              <h3 className="text-lg font-bold mb-4">{tenant.name}</h3>
              {tenant.description && (
                <p className="text-gray-400 text-sm leading-relaxed">{tenant.description.substring(0, 150)}</p>
              )}
              {tenant.socialMedia && Object.keys(tenant.socialMedia).length > 0 && (
                <div className="mt-4 flex gap-3">
                  {tenant.socialMedia.facebook && (
                    <a
                      href={tenant.socialMedia.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white transition"
                      aria-label="Facebook"
                    >
                      📘
                    </a>
                  )}
                  {tenant.socialMedia.instagram && (
                    <a
                      href={tenant.socialMedia.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white transition"
                      aria-label="Instagram"
                    >
                      📷
                    </a>
                  )}
                  {tenant.socialMedia.tiktok && (
                    <a
                      href={tenant.socialMedia.tiktok}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white transition"
                      aria-label="TikTok"
                    >
                      🎵
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Navigation */}
            <div>
              <h4 className="font-semibold mb-4">Navegación</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <a href="#inventory" className="block hover:text-white transition">Inventario</a>
                <a href="#reviews" className="block hover:text-white transition">Reseñas</a>
                <a href="#social" className="block hover:text-white transition">Redes Sociales</a>
                <Link href={`/${subdomain}/appointment`} className="block hover:text-white transition">
                  Agendar Cita
                </Link>
                <Link href={`/${subdomain}/pre-qualify`} className="block hover:text-white transition font-medium text-primary-400">
                  🚗 Pre-Cualificación
                </Link>
                <a href="#contact" className="block hover:text-white transition">Contacto</a>
              </div>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold mb-4">Contacto</h4>
              <div className="space-y-3 text-sm text-gray-400">
                {tenant.contactPhone && (
                  <a href={`tel:${tenant.contactPhone}`} className="block hover:text-white transition">
                    📞 {tenant.contactPhone}
                  </a>
                )}
                {tenant.contactEmail && (
                  <a href={`mailto:${tenant.contactEmail}`} className="block hover:text-white transition">
                    ✉️ {tenant.contactEmail}
                  </a>
                )}
                {tenant.address && (tenant.address.street || tenant.address.city) && (
                  <p className="block">
                    📍 {[tenant.address.street, tenant.address.city, tenant.address.state].filter(Boolean).join(', ')}
                  </p>
                )}
                {tenant.businessHours && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-500 mb-1">Horarios:</p>
                    <p className="text-xs">{tenant.businessHours.split('\n')[0]}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <Link href={subdomain ? `/${subdomain}/policies/privacy` : '#'} className="block hover:text-white transition">
                  Política de Privacidad
                </Link>
                <Link href={subdomain ? `/${subdomain}/policies/terms` : '#'} className="block hover:text-white transition">
                  Términos y Condiciones
                </Link>
                <Link href={`/${subdomain}/policies`} className="block hover:text-white transition">
                  Todas las Políticas
                </Link>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800 mt-8 pt-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
              <p>© {new Date().getFullYear()} {tenant.name}. Todos los derechos reservados.</p>
              <div className="flex gap-4">
                <Link href={`/${subdomain}/pre-qualify`} className="hover:text-white transition">
                  Pre-Cualificación
                </Link>
                <Link href={`/${subdomain}/appointment`} className="hover:text-white transition">
                  Agendar Cita
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Contact Form Modal */}
      {showContactForm && (
        <ContactFormModal
          tenantId={tenant.id}
          onClose={() => setShowContactForm(false)}
        />
      )}

      {selectedVehicle && subdomain && (
        <VehicleDetailModal
          vehicle={selectedVehicle}
          subdomain={subdomain}
          catalogTenantId={tenant.id}
          onClose={() => setSelectedVehicle(null)}
        />
      )}

      {/* Chat Widget - "Necesitas ayuda" */}
      <ChatWidget
        tenantId={tenant.id}
        tenantName={tenant.name}
        welcomeMessage={tenant.websiteSettings?.chat?.welcomeMessage}
        enabled={tenant.websiteSettings?.chat?.enabled !== false}
      />
    </div>
  );
}

function ContactFormModal({
  tenantId,
  onClose,
}: {
  tenantId: string;
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
      const response = await fetch('/api/leads/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          source: 'web',
          contact: formData,
          notes: formData.message,
        }),
      });

      if (response.ok) {
        alert('¡Gracias por contactarnos! Te responderemos pronto.');
        onClose();
        setFormData({ name: '', phone: '', email: '', message: '' });
      } else {
        alert('Error al enviar mensaje');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al enviar mensaje');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold">Contáctanos</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
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
            />
          </div>
          <div className="flex gap-2 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              {loading ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Componente de Posts de Redes Sociales
function SocialPostsSection({ subdomain, tenant }: { subdomain: string | null; tenant: Tenant }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSocialPosts();
  }, [subdomain]);

  async function fetchSocialPosts() {
    try {
      setLoading(true);
      const response = await fetch(`/api/social-posts/${subdomain}?limit=6`);
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Error fetching social posts:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading || posts.length === 0) {
    return null; // No mostrar si no hay posts
  }

  function getPlatformIcon(platform: string) {
    switch (platform) {
      case 'facebook':
        return '📘';
      case 'instagram':
        return '📷';
      case 'tiktok':
        return '🎵';
      default:
        return '📱';
    }
  }

  return (
    <section id="social" className="bg-white py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Síguenos en Redes Sociales</h2>
          <p className="text-gray-600">Mira nuestras últimas publicaciones</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <div key={post.id} className="bg-gray-50 rounded-lg shadow overflow-hidden hover:shadow-lg transition">
              {/* Media */}
              {post.media && post.media.length > 0 && (
                <div className="relative h-48 bg-gray-200">
                  {post.media[0].includes('video') ? (
                    <video
                      src={post.media[0]}
                      className="w-full h-full object-cover"
                      controls
                    />
                  ) : (
                    <img
                      src={post.media[0]}
                      alt="Post"
                      className="w-full h-full object-cover"
                    />
                  )}
                  {post.media.length > 1 && (
                    <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                      +{post.media.length - 1} {post.media.length === 2 ? 'foto' : 'fotos'}
                    </div>
                  )}
                </div>
              )}

              <div className="p-6">
                {/* Platforms */}
                <div className="flex gap-2 mb-3">
                  {post.platforms.map((platform: string) => (
                    <span
                      key={platform}
                      className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded"
                      title={platform.charAt(0).toUpperCase() + platform.slice(1)}
                    >
                      {getPlatformIcon(platform)} {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </span>
                  ))}
                </div>

                {/* Content */}
                <p className="text-gray-700 mb-3 line-clamp-3">{post.content}</p>

                {/* Hashtags */}
                {post.metadata?.hashtags && post.metadata.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {post.metadata.hashtags.slice(0, 3).map((tag: string, index: number) => (
                      <span key={index} className="text-xs text-blue-600">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Date */}
                {post.publishedAt && (
                  <p className="text-xs text-gray-400">
                    {new Date(post.publishedAt).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Links to Social Media */}
        {tenant.socialMedia && Object.keys(tenant.socialMedia).length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-gray-600 mb-4">Síguenos para más contenido:</p>
            <div className="flex justify-center gap-4">
              {tenant.socialMedia.facebook && (
                <a
                  href={tenant.socialMedia.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
                >
                  📘 Facebook
                </a>
              )}
              {tenant.socialMedia.instagram && (
                <a
                  href={tenant.socialMedia.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 flex items-center gap-2"
                >
                  📷 Instagram
                </a>
              )}
              {tenant.socialMedia.tiktok && (
                <a
                  href={tenant.socialMedia.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 flex items-center gap-2"
                >
                  🎵 TikTok
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// Componente de Reseñas para mostrar en la página pública
function ReviewsSection({ subdomain }: { subdomain: string | null }) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);

  useEffect(() => {
    fetchReviews();
  }, [subdomain]);

  async function fetchReviews() {
    try {
      setLoading(true);
      const response = await fetch(`/api/reviews/${subdomain}?limit=6`);
      if (response.ok) {
        const data = await response.json();
        const approvedReviews = (data.reviews || []).filter((r: any) => r.status === 'approved');
        setReviews(approvedReviews);

        if (approvedReviews.length > 0) {
          const avg = approvedReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / approvedReviews.length;
          setAverageRating(avg);
        }
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  }

  function renderStars(rating: number) {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={star <= rating ? 'text-yellow-400 text-lg' : 'text-gray-300 text-lg'}>
            ★
          </span>
        ))}
      </div>
    );
  }

  return (
    <section id="reviews" className="bg-gray-50 py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Reseñas de Nuestros Clientes</h2>
          {reviews.length > 0 ? (
            <>
              {averageRating > 0 && (
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-3xl font-bold">{averageRating.toFixed(1)}</span>
                  {renderStars(Math.round(averageRating))}
                  <span className="text-gray-600">({reviews.length} reseñas)</span>
                </div>
              )}
              <Link
                href={`/${subdomain}/reviews`}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Ver todas las reseñas →
              </Link>
            </>
          ) : (
            <p className="text-gray-600">Aún no hay reseñas disponibles. Las reseñas de nuestros clientes aparecerán aquí cuando estén disponibles.</p>
          )}
        </div>

        {reviews.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.slice(0, 6).map((review) => (
              <div key={review.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold text-gray-900">{review.customerName}</div>
                  {review.featured && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      ⭐ Destacada
                    </span>
                  )}
                </div>
                {review.title && (
                  <h4 className="font-medium text-gray-800 mb-2">{review.title}</h4>
                )}
                <div className="mb-3">{renderStars(review.rating)}</div>
                <p className="text-gray-700 text-sm mb-3 line-clamp-3">{review.comment}</p>

                {/* Fotos */}
                {review.photos && review.photos.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {review.photos.slice(0, 3).map((photo: string, index: number) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`Foto ${index + 1}`}
                        className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80"
                        onClick={() => window.open(photo, '_blank')}
                      />
                    ))}
                  </div>
                )}

                {/* Videos */}
                {review.videos && review.videos.length > 0 && (
                  <div className="mb-2">
                    {review.videos.slice(0, 1).map((video: string, index: number) => (
                      <video
                        key={index}
                        src={video}
                        className="w-full h-32 object-cover rounded"
                        controls
                      />
                    ))}
                  </div>
                )}

                <p className="text-xs text-gray-400">
                  {new Date(review.createdAt).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                {review.response && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-600 mb-1">Respuesta del concesionario:</p>
                    <p className="text-sm text-gray-700 italic">"{review.response.text}"</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
