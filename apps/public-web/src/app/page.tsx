'use client';

import { useState, useEffect, useCallback, useMemo, Fragment, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import StarRating from '../components/StarRating';
import HeroSearch from '../components/HeroSearch';
import AdvancedFilters from '../components/AdvancedFilters';
import FeaturedVehicles from '../components/FeaturedVehicles';
import FinanceCalculator from '../components/FinanceCalculator';
import FeaturedDealers from '../components/FeaturedDealers';
import VehicleCategories from '../components/VehicleCategories';
import EvGaragePromo from '../components/EvGaragePromo';
import ReviewsSection from '../components/ReviewsSection';
import SponsoredContent from '../components/SponsoredContent';
import HeroBanner from '../components/HeroBanner';
import BrandGrid from '../components/BrandGrid';
import ExclusiveOffersLandingSection from '../components/ExclusiveOffersLandingSection';
import InventoryFinderCta from '../components/InventoryFinderCta';
import WhyChooseUsLandingSection from '../components/WhyChooseUsLandingSection';
import QuickListingsSection from '../components/QuickListingsSection';
import SidebarBanner from '../components/SidebarBanner';
import BetweenContentBanner from '../components/BetweenContentBanner';
import ContactForm from '../components/ContactForm';
import LandingFooter from '../components/LandingFooter';
import {
  PublicSiteNavbarBrand,
  type PublicSiteBrandingInfo,
} from '../components/PublicSiteNavbarBrand';
import { SITE_INFO as DEFAULT_SITE_INFO, getSiteInfo } from '../config/site-info';
import { getFirstPhoto, handleImageError } from '../lib/vehicle-image';

/** logo.clearbit.com ya no sirve logos públicos; Simple Icons (jsDelivr) es estable. Lexus no tiene slug en v13 → favicon. */
const CERTIFIED_BRANDS_ICONS = 'https://cdn.jsdelivr.net/npm/simple-icons@13.21.0/icons';
const CERTIFIED_BRANDS = [
  { name: 'Toyota', logo: `${CERTIFIED_BRANDS_ICONS}/toyota.svg` },
  { name: 'Honda', logo: `${CERTIFIED_BRANDS_ICONS}/honda.svg` },
  { name: 'Ford', logo: `${CERTIFIED_BRANDS_ICONS}/ford.svg` },
  { name: 'Chevrolet', logo: `${CERTIFIED_BRANDS_ICONS}/chevrolet.svg` },
  { name: 'Nissan', logo: `${CERTIFIED_BRANDS_ICONS}/nissan.svg` },
  { name: 'Jeep', logo: `${CERTIFIED_BRANDS_ICONS}/jeep.svg` },
  { name: 'BMW', logo: `${CERTIFIED_BRANDS_ICONS}/bmw.svg` },
  { name: 'Mercedes-Benz', logo: `${CERTIFIED_BRANDS_ICONS}/mercedes.svg` },
  { name: 'Audi', logo: `${CERTIFIED_BRANDS_ICONS}/audi.svg` },
  { name: 'Lexus', logo: 'https://www.google.com/s2/favicons?domain=lexus.com&sz=128' },
  { name: 'Mazda', logo: `${CERTIFIED_BRANDS_ICONS}/mazda.svg` },
  { name: 'Tesla', logo: `${CERTIFIED_BRANDS_ICONS}/tesla.svg` },
] as const;

interface Banner {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  ctaText: string;
  linkType: 'vehicle' | 'dealer' | 'seller' | 'filter';
  linkValue: string;
  clicks: number;
  views: number;
}

interface Promotion {
  id: string;
  name: string;
  description: string;
  discount?: {
    type: 'percentage' | 'fixed';
    value: number;
  };
  tenantId: string;
  tenantName?: string;
  vehicleId?: string;
  promotionScope: 'vehicle' | 'dealer' | 'seller';
  imageUrl?: string;
  views: number;
  clicks: number;
  expiresAt?: string;
  sellerRating?: number;
  sellerRatingCount?: number;
  dealerRating?: number;
  dealerRatingCount?: number;
}

interface Vehicle {
  id: string;
  tenantId: string;
  tenantName?: string;
  make: string;
  model: string;
  year: number;
  price: number;
  currency: string;
  photos: string[];
  mileage?: number;
  condition: string;
  description: string;
  specifications?: {
    transmission?: string;
    fuelType?: string;
  };
  stockNumber?: string;
  isFeatured?: boolean;
  location?: string;
}

export default function LandingPage() {
  const realtimeBanners: Banner[] = [];
  const bannersLoading = false;
  const realtimePromotions: Promotion[] = [];
  const promotionsLoading = false;

  const [banners, setBanners] = useState<Banner[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    make: 'all',
    model: '',
    yearMin: '',
    yearMax: '',
    priceMin: '',
    priceMax: '',
    mileageMax: '',
    fuelType: 'all',
    transmission: 'all',
    condition: 'all',
    location: '',
    bodyType: 'all',
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'year-desc' | 'mileage-asc'>('price-asc');
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [comparisonError, setComparisonError] = useState<string | null>(null);

  // Auto-hide comparison error
  useEffect(() => {
    if (comparisonError) {
      const timer = setTimeout(() => setComparisonError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [comparisonError]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [featuredDealers, setFeaturedDealers] = useState<any[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [landingConfig, setLandingConfig] = useState<any>(null);
  const [scrolled, setScrolled] = useState(false);
  const [siteInfo, setSiteInfo] = useState(DEFAULT_SITE_INFO);
  const [freeListingsCta, setFreeListingsCta] = useState({
    enabled: true,
    maxActiveFreeVehiclesPerSeller: 2,
    quickListingPath: '/publicar-gratis',
    durationDays: 14,
    ctaTitle: '¿Quieres vender?',
    ctaSubtitle: 'Publica tu auto hoy mismo y llega a millones',
    ctaButtonLabel: 'Publicar Gratis',
    registerPath: '/register?type=seller',
  });
  const fetchingVehiclesRef = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    async function loadSiteInfo() {
      try {
        const info = await getSiteInfo();
        setSiteInfo(info);
      } catch (error) {
        console.error('Error loading site info:', error);
        // Mantener DEFAULT_SITE_INFO si falla
      }
    }
    loadSiteInfo();
  }, []);

  useEffect(() => {
    async function loadFreeListingsCta() {
      try {
        const res = await fetch('/api/public/free-listings-config');
        if (res.ok) {
          const data = await res.json();
          setFreeListingsCta((prev) => ({ ...prev, ...data }));
        }
      } catch {
        /* mantener valores por defecto */
      }
    }
    loadFreeListingsCta();
  }, []);

  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [banners.length]);

  useEffect(() => {
    async function fetchLandingConfig() {
      try {
        const response = await fetch('/api/public/landing-config', {
          next: { revalidate: 300 }, // Caché de 5 minutos
        });
        if (response.ok) {
          const data = await response.json();
          setLandingConfig(data);
        }
      } catch (error) {
        console.error('Error fetching landing config:', error);
      }
    }
    fetchLandingConfig();
  }, []);

  const applyFilters = useCallback(() => {
    let filtered = [...vehicles];

    if (filters.make !== 'all') {
      filtered = filtered.filter(v => v.make === filters.make);
    }

    if (filters.model) {
      const modelLower = filters.model.toLowerCase();
      filtered = filtered.filter(v =>
        v.model.toLowerCase().includes(modelLower)
      );
    }

    if (filters.yearMin) {
      filtered = filtered.filter(v => v.year >= parseInt(filters.yearMin));
    }

    if (filters.yearMax) {
      filtered = filtered.filter(v => v.year <= parseInt(filters.yearMax));
    }

    if (filters.priceMin) {
      filtered = filtered.filter(v => v.price >= parseFloat(filters.priceMin));
    }

    if (filters.priceMax) {
      filtered = filtered.filter(v => v.price <= parseFloat(filters.priceMax));
    }

    if (filters.mileageMax) {
      filtered = filtered.filter(v => !v.mileage || v.mileage <= parseInt(filters.mileageMax));
    }

    if (filters.fuelType && filters.fuelType !== 'all') {
      filtered = filtered.filter(v => v.specifications?.fuelType === filters.fuelType);
    }

    if (filters.transmission && filters.transmission !== 'all') {
      filtered = filtered.filter(v => v.specifications?.transmission === filters.transmission);
    }

    if (filters.condition && filters.condition !== 'all') {
      filtered = filtered.filter(v => v.condition === filters.condition);
    }

    if (filters.bodyType && filters.bodyType !== 'all') {
      filtered = filtered.filter((v: any) => {
        const vehicleBodyType = (v as any).bodyType || v.specifications?.bodyType;
        if (!vehicleBodyType) return false;
        // Normalizar ambos valores para comparar
        const normalizedVehicleType = String(vehicleBodyType).trim().toLowerCase();
        const normalizedFilterType = String(filters.bodyType).trim().toLowerCase();
        return normalizedVehicleType === normalizedFilterType;
      });
    }

    if (filters.location) {
      filtered = filtered.filter(v =>
        v.description?.toLowerCase().includes(filters.location.toLowerCase()) ||
        (v as any)?.specifications?.location?.toLowerCase()?.includes(filters.location.toLowerCase())
      );
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'year-desc':
          return b.year - a.year;
        case 'mileage-asc':
          return (a.mileage || 0) - (b.mileage || 0);
        default:
          return 0;
      }
    });

    setFilteredVehicles(filtered);
  }, [vehicles, filters, sortBy]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const uniqueMakes = useMemo(() => {
    return Array.from(new Set(vehicles.map(v => v.make))).sort();
  }, [vehicles]);

  const vehicleCountsByBodyType = useMemo(() => {
    const counts: Record<string, number> = {};
    vehicles.forEach((v: any) => {
      const bodyType = v.bodyType || v.specifications?.bodyType;
      if (bodyType) {
        // Normalizar: convertir a string, quitar espacios, convertir a minúsculas y quitar acentos
        const normalizedBodyType = String(bodyType)
          .trim()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, ""); // Quitar acentos

        // Mapear variantes comunes
        let finalKey = normalizedBodyType;
        if (normalizedBodyType === 'deportivo' || normalizedBodyType === 'sport' || normalizedBodyType === 'coupe') finalKey = 'deportivo';
        if (normalizedBodyType === 'van' || normalizedBodyType === 'minivan') finalKey = 'minivan';
        if (normalizedBodyType === 'electric' || normalizedBodyType === 'hybrid' || normalizedBodyType === 'hibrido-ev' || normalizedBodyType === 'hibrido') finalKey = 'hibrido-ev';
        if (normalizedBodyType === 'pick-up' || normalizedBodyType === 'pickup' || normalizedBodyType === 'camioneta') finalKey = 'pickup';

        if (finalKey && finalKey !== 'undefined' && finalKey !== 'null') {
          counts[finalKey] = (counts[finalKey] || 0) + 1;
        }
      }
    });
    return counts;
  }, [vehicles]);

  const fetchFeaturedDealers = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos timeout

      const response = await fetch('/api/public/search?type=dealers&q=*', {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const rawDealers = data.results?.dealers || data.dealers || [];
        const dealers = rawDealers.sort((a: any, b: any) => {
          const aScore = (a.dealerRating || 0) * 10 + (a.publishedVehiclesCount || 0);
          const bScore = (b.dealerRating || 0) * 10 + (b.publishedVehiclesCount || 0);
          if (bScore !== aScore) return bScore - aScore;
          return String(a.name || '').localeCompare(String(b.name || ''), 'es');
        }).slice(0, 6);
        setFeaturedDealers(dealers);
        // Guardar en sessionStorage
        try {
          sessionStorage.setItem('dealers_cache_v2', JSON.stringify(dealers));
          sessionStorage.setItem('dealers_cache_v2_timestamp', Date.now().toString());
        } catch (e) {
          // Ignorar errores de sessionStorage
        }
      } else {
        setFeaturedDealers([]);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching featured dealers:', error);
      }
      setFeaturedDealers([]);
    }
  }, []);

  const fetchBanners = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos timeout

      const response = await fetch('/api/public/banners?status=active&limit=4', {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const banners = data.banners || [];
        setBanners(banners);
        // Guardar en sessionStorage
        try {
          sessionStorage.setItem('banners_cache', JSON.stringify(banners));
          sessionStorage.setItem('banners_cache_timestamp', Date.now().toString());
        } catch (e) {
          // Ignorar errores de sessionStorage
        }
      } else {
        setBanners([]);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching banners:', error);
      }
      setBanners([]);
    }
  }, []);

  const fetchPromotions = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos timeout

      const response = await fetch('/api/public/promotions?limit=12', {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const promotions = data.promotions || [];
        setPromotions(promotions);
        // Guardar en sessionStorage
        try {
          sessionStorage.setItem('promotions_cache', JSON.stringify(promotions));
          sessionStorage.setItem('promotions_cache_timestamp', Date.now().toString());
        } catch (e) {
          // Ignorar errores de sessionStorage
        }
      } else {
        setPromotions([]);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching promotions:', error);
      }
      setPromotions([]);
    }
  }, []);

  const fetchVehicles = useCallback(async () => {
    // Evitar múltiples fetches simultáneos
    if (fetchingVehiclesRef.current) {
      return;
    }

    try {
      fetchingVehiclesRef.current = true;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout (aumentado para dar más tiempo al servidor)

      const response = await fetch('/api/public/vehicles?status=available', {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();

        if (!data.vehicles || !Array.isArray(data.vehicles)) {
          setVehicles([]);
          setFilteredVehicles([]);
          setLoading(false);
          return;
        }

        const vehiclesWithPhotos = (data.vehicles || []).map((vehicle: any) => {
          // Soportar both photos e images para consistencia localhost/hosting
          const rawPhotos = Array.isArray(vehicle.photos) ? vehicle.photos : (Array.isArray(vehicle.images) ? vehicle.images : []);
          const photos = rawPhotos.filter((photo: string) =>
            photo && typeof photo === 'string' && photo.trim() !== '' && photo !== 'undefined' && !String(photo).includes('undefined')
          );
          const stockNumber = vehicle.stockNumber || vehicle.specifications?.stockNumber;

          return {
            ...vehicle,
            stockNumber,
            photos,
          };
        });

        setVehicles(vehiclesWithPhotos);
        setFilteredVehicles(vehiclesWithPhotos);
        setLoading(false);

        // Guardar en sessionStorage para persistencia
        try {
          sessionStorage.setItem('vehicles_cache_v4', JSON.stringify(vehiclesWithPhotos));
          sessionStorage.setItem('vehicles_cache_v4_timestamp', Date.now().toString());
        } catch (e) {
          // Ignorar errores de sessionStorage (puede estar deshabilitado)
        }

      } else {
        const errorText = await response.text();
        setVehicles([]);
        setFilteredVehicles([]);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error(`Error fetching vehicles: ${error.message || error}`);
      } else {
        // Si hay timeout, intentar cargar desde caché como último recurso
        try {
          const savedVehicles = sessionStorage.getItem('vehicles_cache_v4');
          if (savedVehicles) {
            const parsedVehicles = JSON.parse(savedVehicles);
            if (Array.isArray(parsedVehicles) && parsedVehicles.length > 0) {
              setVehicles(parsedVehicles);
              setFilteredVehicles(parsedVehicles);
              setLoading(false);
              fetchingVehiclesRef.current = false;
              return;
            }
          }
        } catch (cacheError) {
          console.error(`Error cargando desde caché: ${cacheError}`);
        }
      }
      // Solo limpiar si realmente no hay datos
      const hasCachedData = sessionStorage.getItem('vehicles_cache_v4');
      if (!hasCachedData) {
        setVehicles([]);
        setFilteredVehicles([]);
      }
    } finally {
      setLoading(false);
      fetchingVehiclesRef.current = false;
    }
  }, []);

  const handleBannerClick = useCallback((banner: Banner) => {
    fetch(`/api/public/banners/${banner.id}/click`, { method: 'POST' }).catch(console.error);

    if (banner.linkType === 'vehicle' && banner.linkValue) {
      const vehicle = vehicles.find(v => v.id === banner.linkValue);
      if (vehicle) {
        window.location.href = `/${vehicle.tenantId}/vehicle/${banner.linkValue}`;
      }
    } else if (banner.linkType === 'dealer' || banner.linkType === 'seller') {
      window.location.href = `/${banner.linkValue}`;
    } else if (banner.linkType === 'filter') {
      const filterData = JSON.parse(banner.linkValue);
      setFilters(prev => ({ ...prev, ...filterData }));
      document.getElementById('vehicles-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [vehicles]);

  const handlePromotionClick = useCallback((promotion: Promotion) => {
    fetch(`/api/public/promotions/${promotion.id}/click`, { method: 'POST' }).catch(console.error);

    if (promotion.vehicleId) {
      window.location.href = `/${promotion.tenantId}/vehicle/${promotion.vehicleId}`;
    } else if (promotion.promotionScope === 'dealer' || promotion.promotionScope === 'seller') {
      window.location.href = `/${promotion.tenantId}`;
    }
  }, []);

  // Cargar datos desde sessionStorage al montar
  useEffect(() => {
    const CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutos

    // Cargar vehículos desde caché
    try {
      const savedVehicles = sessionStorage.getItem('vehicles_cache_v4');
      const savedTimestamp = sessionStorage.getItem('vehicles_cache_v4_timestamp');

      if (savedVehicles && savedTimestamp) {
        const timestamp = parseInt(savedTimestamp);
        const now = Date.now();
        const cacheAge = now - timestamp;

        if (cacheAge < CACHE_MAX_AGE) {
          try {
            const parsedVehicles = JSON.parse(savedVehicles);
            if (Array.isArray(parsedVehicles) && parsedVehicles.length > 0) {
              setVehicles(parsedVehicles);
              setFilteredVehicles(parsedVehicles);
              setLoading(false);
              // Hacer fetch en segundo plano para actualizar
              fetchVehicles();
            } else {
              fetchVehicles();
            }
          } catch (e) {
            fetchVehicles();
          }
        } else {
          fetchVehicles();
        }
      } else {
        fetchVehicles();
      }
    } catch (e) {
      fetchVehicles();
    }

    // Cargar dealers desde caché
    try {
      const savedDealers = sessionStorage.getItem('dealers_cache_v2');
      const savedTimestamp = sessionStorage.getItem('dealers_cache_v2_timestamp');
      if (savedDealers && savedTimestamp) {
        const timestamp = parseInt(savedTimestamp);
        const cacheAge = Date.now() - timestamp;
        if (cacheAge < CACHE_MAX_AGE) {
          try {
            const parsedDealers = JSON.parse(savedDealers);
            if (Array.isArray(parsedDealers)) {
              setFeaturedDealers(parsedDealers);
              // Hacer fetch en segundo plano
              fetchFeaturedDealers();
            } else {
              fetchFeaturedDealers();
            }
          } catch (e) {
            fetchFeaturedDealers();
          }
        } else {
          fetchFeaturedDealers();
        }
      } else {
        fetchFeaturedDealers();
      }
    } catch (e) {
      fetchFeaturedDealers();
    }

    // Cargar banners desde caché
    try {
      const savedBanners = sessionStorage.getItem('banners_cache');
      const savedTimestamp = sessionStorage.getItem('banners_cache_timestamp');
      if (savedBanners && savedTimestamp) {
        const timestamp = parseInt(savedTimestamp);
        const cacheAge = Date.now() - timestamp;
        if (cacheAge < CACHE_MAX_AGE) {
          try {
            const parsedBanners = JSON.parse(savedBanners);
            if (Array.isArray(parsedBanners)) {
              setBanners(parsedBanners);
              // Hacer fetch en segundo plano
              fetchBanners();
            } else {
              fetchBanners();
            }
          } catch (e) {
            fetchBanners();
          }
        } else {
          fetchBanners();
        }
      } else {
        fetchBanners();
      }
    } catch (e) {
      fetchBanners();
    }

    // Cargar promotions desde caché
    try {
      const savedPromotions = sessionStorage.getItem('promotions_cache');
      const savedTimestamp = sessionStorage.getItem('promotions_cache_timestamp');
      if (savedPromotions && savedTimestamp) {
        const timestamp = parseInt(savedTimestamp);
        const cacheAge = Date.now() - timestamp;
        if (cacheAge < CACHE_MAX_AGE) {
          try {
            const parsedPromotions = JSON.parse(savedPromotions);
            if (Array.isArray(parsedPromotions)) {
              setPromotions(parsedPromotions);
              // Hacer fetch en segundo plano
              fetchPromotions();
            } else {
              fetchPromotions();
            }
          } catch (e) {
            fetchPromotions();
          }
        } else {
          fetchPromotions();
        }
      } else {
        fetchPromotions();
      }
    } catch (e) {
      fetchPromotions();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-white">

      {/* Navbar Profesional y Corporativo */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-md border-b border-gray-200' : 'bg-white/80 backdrop-blur-sm'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-4">
              <PublicSiteNavbarBrand siteInfo={siteInfo as PublicSiteBrandingInfo} />
            </div>
            <div className="hidden lg:flex items-center gap-8">
              <a href="#vehicles" className="text-slate-700 hover:text-slate-900 transition font-medium text-sm tracking-wide">Vehículos</a>
              <a href="#promotions" className="text-slate-700 hover:text-slate-900 transition font-medium text-sm flex items-center gap-2">
                Promociones
                {promotions.length > 0 && (
                  <span className="px-2 py-0.5 bg-amber-500 text-white text-xs font-semibold rounded">
                    {promotions.length}
                  </span>
                )}
              </a>
              <Link href="/dealers" className="text-slate-700 hover:text-slate-900 transition font-medium text-sm">Concesionarios</Link>
              <a href="#contact" className="text-slate-700 hover:text-slate-900 transition font-medium text-sm">Contacto</a>
              <Link
                href="/login"
                className="bg-slate-900 text-white px-6 py-2.5 rounded-md hover:bg-slate-800 transition-all font-medium text-sm tracking-wide"
              >
                Iniciar Sesión
              </Link>
            </div>
            <button className="lg:hidden text-slate-700 p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Banner - Spacing adjusted for fixed header to prevent overlap */}
      <div className="pt-40 pb-8 bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <HeroBanner />
        </div>
      </div>

      {/* Hero Section Ultra Profesional con Imagen de Fondo */}
      <section className="relative pt-12 pb-24 min-h-[85vh] flex items-center overflow-hidden">
        {/* Background con gradiente profesional */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"></div>
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}
        ></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-20">
          <div className="text-center max-w-5xl mx-auto">
            {/* Badge de Confianza */}
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/10 backdrop-blur-md rounded-full mb-8 border border-white/20">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-white font-semibold text-sm">Más de {vehicles.length} vehículos verificados</span>
              </div>
              <div className="w-px h-4 bg-white/30"></div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-white font-semibold text-sm">100% Garantizado</span>
              </div>
            </div>

            <h1 className="text-6xl md:text-7xl lg:text-8xl font-extrabold mb-8 leading-tight tracking-tight">
              <span className="text-white">Encuentra tu</span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                vehículo perfecto
              </span>
            </h1>
            <p className="text-2xl md:text-3xl text-white/90 mb-6 max-w-3xl mx-auto leading-relaxed font-medium">
              La plataforma más confiable para comprar y vender vehículos
            </p>
            <p className="text-lg text-white/70 mb-12 max-w-2xl mx-auto">
              Financiamiento aprobado • Garantías verificadas • Transacciones 100% seguras • Inspección profesional incluida
            </p>

            <div className="max-w-4xl mx-auto mb-16">
              <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
                <HeroSearch onSearch={(filters) => {
                  setFilters(prev => ({ ...prev, ...filters as any }));
                  document.getElementById('vehicles-section')?.scrollIntoView({ behavior: 'smooth' });
                }} />
              </div>
            </div>

            {/* Stats Premium con iconos */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {(siteInfo.statisticsVisibility?.verifiedVehicles ?? true) && (
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all">
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-4xl font-bold text-white mb-2">
                    {siteInfo.statistics?.verifiedVehicles || `${vehicles.length}+`}
                  </div>
                  <div className="text-sm text-white/80 font-medium uppercase tracking-wide">Vehículos Verificados</div>
                </div>
              )}
              {(siteInfo.statisticsVisibility?.certifiedDealers ?? true) && (
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all">
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-4xl font-bold text-white mb-2">
                    {siteInfo.statistics?.certifiedDealers || `${featuredDealers.length}+`}
                  </div>
                  <div className="text-sm text-white/80 font-medium uppercase tracking-wide">Concesionarios Certificados</div>
                </div>
              )}
              {(siteInfo.statisticsVisibility?.warrantyIncluded ?? true) && (
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all">
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-4xl font-bold text-white mb-2">
                    {siteInfo.statistics?.warrantyIncluded || 'Disponible'}
                  </div>
                  <div className="text-sm text-white/80 font-medium uppercase tracking-wide">Garantía Incluida</div>
                </div>
              )}
              {(siteInfo.statisticsVisibility?.supportAvailable ?? true) && (
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all">
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-4xl font-bold text-white mb-2">
                    {siteInfo.statistics?.supportAvailable || 'Disponible'}
                  </div>
                  <div className="text-sm text-white/80 font-medium uppercase tracking-wide">Soporte Disponible</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Categorías de Vehículos */}
      <VehicleCategories
        vehicleCounts={vehicleCountsByBodyType}
      />

      {/* Promoción EV & Garage */}
      <EvGaragePromo config={landingConfig?.config?.promos} />

      {/* Marcas Populares */}


      {/* Vehículos Destacados - PREMIUM CAROUSEL */}
      <FeaturedVehicles vehicles={vehicles} />

      {/* Listado General de Vehículos con Sidebar */}
      <section id="vehicles" className="py-32 bg-slate-50 relative overflow-hidden">
        {/* Subtle Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
        <div className="absolute top-[20%] right-0 w-[500px] h-[500px] bg-blue-100/30 rounded-full blur-[120px] -z-0"></div>
        <div className="absolute bottom-[20%] -left-24 w-[400px] h-[400px] bg-indigo-100/30 rounded-full blur-[100px] -z-0"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col mb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 pb-12 border-b border-slate-200/60">
              <div className="relative">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-1.5 w-12 bg-blue-600 rounded-full"></div>
                  <span className="text-blue-600 font-black text-[10px] uppercase tracking-[0.4em] mb-0.5">Marketplace Nacional</span>
                </div>
                <h2 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-[0.9] mb-8">
                  Explora Nuestro <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800">Inventario Premium</span>
                </h2>
                <p className="text-xl text-slate-500 max-w-xl font-medium leading-relaxed">
                  Accede a la selección más rigurosa del mercado. Más de <span className="text-slate-900 font-black underline decoration-blue-500/30 underline-offset-4">{vehicles.length}</span> unidades certificadas con garantía de satisfacción total.
                </p>
              </div>

              <div className="flex items-center gap-8 bg-white p-4 rounded-[2rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-100 min-w-[280px]">
                <div className="flex-1 text-center border-r border-slate-100 px-4">
                  <span className="block text-3xl font-black text-slate-900 tracking-tighter">{filteredVehicles.length}</span>
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Coincidencias</span>
                </div>
                <div className="flex-1 text-center px-4">
                  <div className="flex items-center justify-center gap-1 text-blue-600 mb-0.5">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    <span className="text-sm font-black tracking-tighter italic">CERTIFIED</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Calidad Garantizada</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Body Type Selector - Top of Catalog */}
          <div className="relative mb-20 px-1">
            <div className="flex overflow-x-auto gap-6 pb-8 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
              {[
                { id: 'all', label: 'Todos los Vehículos', img: '/sedan_category_1773634522734.png', color: 'bg-slate-900' },
                { id: 'sedan', label: 'Sedán', img: '/sedan_category_1773634522734.png', color: 'bg-blue-600' },
                { id: 'suv', label: 'SUV', img: '/suv_category_1773634541924.png', color: 'bg-emerald-600' },
                { id: 'pickup', label: 'Pickup', img: '/pickup_category_1773634558726.png', color: 'bg-amber-600' },
                { id: 'coupe', label: 'Deportivo', img: '/sports_category_1773634575517.png', color: 'bg-rose-600' },
                { id: 'van', label: 'Miniván', img: '/minivan_category_1773634597825.png', color: 'bg-indigo-600' },
                { id: 'hybrid', label: 'Híbrido / EV', img: '/electric_category_1773634619169.png', color: 'bg-teal-500' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setFilters({ ...filters, bodyType: cat.id })}
                  className={`flex-shrink-0 relative group flex flex-col items-center justify-center w-36 h-44 rounded-[2.5rem] transition-all duration-500 ${filters.bodyType === cat.id
                    ? `${cat.color} text-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] -translate-y-3 scale-110 ring-4 ring-white`
                    : 'bg-white text-slate-600 border border-slate-100 hover:border-blue-400/50 hover:shadow-2xl hover:shadow-slate-200/60 hover:-translate-y-2'
                    }`}
                >
                  <div className="w-24 h-24 rounded-2xl overflow-hidden mb-4 shadow-md group-hover:scale-110 transition-transform duration-500 border border-white/20">
                    <img src={cat.img} alt={cat.label} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-[0.1em] text-center px-2">{cat.label}</span>
                  {filters.bodyType === cat.id && (
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-sm"></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Brands Slider Section - Premium Marquee */}
        <div className="bg-slate-50/50 py-12 border-y border-slate-100 overflow-hidden relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 text-center">
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">Marcas Certificadas</span>
          </div>

          <div className="flex overflow-hidden group">
            <div className="flex gap-16 animate-marquee whitespace-nowrap py-8">
              {CERTIFIED_BRANDS.map((brand) => (
                <div key={brand.name} className="flex flex-col items-center gap-4 group/brand">
                  <div className="w-24 h-24 bg-white rounded-3xl shadow-md border border-slate-100 flex items-center justify-center p-5 grayscale group-hover/brand:grayscale-0 transition-all duration-700 hover:shadow-xl hover:border-blue-200">
                    <img
                      src={brand.logo}
                      alt={brand.name}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      decoding="async"
                      className="max-w-full max-h-full object-contain transform group-hover/brand:scale-110 transition-transform duration-500"
                    />
                  </div>
                  <span className="text-[11px] font-black text-slate-400 group-hover/brand:text-blue-600 uppercase tracking-widest transition-colors">{brand.name}</span>
                </div>
              ))}
            </div>
            {/* Repeat for seamless loop */}
            <div className="flex gap-16 animate-marquee whitespace-nowrap py-8" aria-hidden="true">
              {CERTIFIED_BRANDS.map((brand) => (
                <div key={`${brand.name}-loop`} className="flex flex-col items-center gap-4 group/brand">
                  <div className="w-24 h-24 bg-white rounded-3xl shadow-md border border-slate-100 flex items-center justify-center p-5 grayscale group-hover/brand:grayscale-0 transition-all duration-700 hover:shadow-xl hover:border-blue-200">
                    <img
                      src={brand.logo}
                      alt=""
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      decoding="async"
                      className="max-w-full max-h-full object-contain transform group-hover/brand:scale-110 transition-transform duration-500"
                    />
                  </div>
                  <span className="text-[11px] font-black text-slate-400 group-hover/brand:text-blue-600 uppercase tracking-widest transition-colors">{brand.name}</span>
                </div>
              ))}
            </div>
          </div>

          <style jsx>{`
            @keyframes marquee {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .animate-marquee {
              animation: marquee 30s linear infinite;
            }
            .animate-marquee:hover {
              animation-play-state: paused;
            }
          `}</style>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
            {/* Sidebar con anuncios y filtros rápidos */}
            <aside className="lg:col-span-1 order-2 lg:order-1 flex flex-col gap-8">
              <div className="sticky top-24 flex flex-col gap-8">
                {/* Advanced Search Context Card */}
                <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 rounded-full blur-3xl group-hover:bg-blue-600/40 transition-all"></div>
                  <h4 className="text-sm font-bold opacity-60 uppercase tracking-widest mb-4">Filtrado Inteligente</h4>
                  <p className="text-lg font-bold mb-6 leading-snug">Refina tu búsqueda por características técnicas</p>

                  <div className="space-y-5 mb-6">
                    {/* Transmisión */}
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-1">Transmisión</span>
                      <div className="relative">
                        <select
                          value={filters.transmission}
                          onChange={(e) => setFilters({ ...filters, transmission: e.target.value })}
                          className="w-full bg-white/5 text-sm font-bold p-3 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer"
                        >
                          <option value="all" className="bg-slate-900">Todas</option>
                          <option value="automatic" className="bg-slate-900">Automática</option>
                          <option value="manual" className="bg-slate-900">Manual</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/30">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      </div>
                    </div>

                    {/* Combustible */}
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-1">Combustible</span>
                      <div className="relative">
                        <select
                          value={filters.fuelType}
                          onChange={(e) => setFilters({ ...filters, fuelType: e.target.value })}
                          className="w-full bg-white/5 text-sm font-bold p-3 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer"
                        >
                          <option value="all" className="bg-slate-900">Todos</option>
                          <option value="gasoline" className="bg-slate-900">Gasolina</option>
                          <option value="electric" className="bg-slate-900">Eléctrico</option>
                          <option value="hybrid" className="bg-slate-900">Híbrido</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/30">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      </div>
                    </div>

                    {/* Rango de Precio */}
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-1">Rango de Precio</span>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          placeholder="Min"
                          value={filters.priceMin}
                          onChange={(e) => setFilters({ ...filters, priceMin: e.target.value })}
                          className="w-full bg-white/5 text-sm font-bold p-3 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-white/20"
                        />
                        <input
                          type="number"
                          placeholder="Max"
                          value={filters.priceMax}
                          onChange={(e) => setFilters({ ...filters, priceMax: e.target.value })}
                          className="w-full bg-white/5 text-sm font-bold p-3 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-white/20"
                        />
                      </div>
                    </div>

                    {/* Rango de Año */}
                    <div className="flex flex-col gap-2 pb-4">
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-1">Rango de Año</span>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          placeholder="Desde"
                          value={filters.yearMin}
                          onChange={(e) => setFilters({ ...filters, yearMin: e.target.value })}
                          className="w-full bg-white/5 text-sm font-bold p-3 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-white/20"
                        />
                        <input
                          type="number"
                          placeholder="Hasta"
                          value={filters.yearMax}
                          onChange={(e) => setFilters({ ...filters, yearMax: e.target.value })}
                          className="w-full bg-white/5 text-sm font-bold p-3 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-white/20"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setFilters({
                      ...filters,
                      transmission: 'all',
                      fuelType: 'all',
                      priceMin: '',
                      priceMax: '',
                      yearMin: '',
                      yearMax: ''
                    })}
                    className="w-full py-3 text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 border border-blue-400/30 rounded-xl hover:bg-blue-400 hover:text-white transition-all"
                  >
                    Limpiar Filtros
                  </button>
                </div>

                <SidebarBanner />

                {/* Sell CTA Mini — copy y visibilidad desde admin (/admin/settings/free-public-listings) */}
                {freeListingsCta.enabled && freeListingsCta.maxActiveFreeVehiclesPerSeller > 0 && (
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h5 className="font-bold text-slate-900 mb-2">{freeListingsCta.ctaTitle}</h5>
                    <p className="text-xs text-slate-500 mb-4 font-medium">{freeListingsCta.ctaSubtitle}</p>
                    <p className="text-[10px] text-slate-400 mb-3">
                      Hasta {freeListingsCta.maxActiveFreeVehiclesPerSeller} anuncio(s) gratis · {freeListingsCta.durationDays} día(s) cada uno
                    </p>
                    <Link
                      href={freeListingsCta.quickListingPath?.startsWith('/') ? freeListingsCta.quickListingPath : '/publicar-gratis'}
                      className="block w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-colors"
                    >
                      {freeListingsCta.ctaButtonLabel}
                    </Link>
                    <Link
                      href={freeListingsCta.registerPath?.startsWith('/') ? freeListingsCta.registerPath : '/register?type=seller'}
                      className="block w-full py-2 mt-2 text-[11px] font-medium text-slate-600 underline underline-offset-2 hover:text-blue-600"
                    >
                      O regístrate como vendedor para más beneficios
                    </Link>
                  </div>
                )}
              </div>
            </aside>

            <div className="lg:col-span-3 order-1 lg:order-2">
              {/* Controles de vista y ordenamiento - Premium */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 bg-white p-4 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-gray-100">
                <div className="flex items-center w-full sm:w-auto">
                  <span className="text-gray-500 text-sm font-medium mr-3 hidden sm:block">Ordenar por:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full sm:w-auto border-0 bg-gray-50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-gray-700 font-semibold cursor-pointer transition-colors appearance-none"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")', backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
                  >
                    <option value="price-asc">Precio: Menor a Mayor</option>
                    <option value="price-desc">Precio: Mayor a Menor</option>
                    <option value="year-desc">Año: Más Reciente</option>
                    <option value="mileage-asc">Millas: Menor a Mayor</option>
                  </select>
                </div>

                <div className="flex p-1 bg-gray-50 rounded-xl w-full sm:w-auto">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`flex-1 sm:flex-none px-6 py-2.5 transition-all text-sm font-bold rounded-lg ${viewMode === 'grid'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                      }`}
                  >
                    Cuadrícula
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`flex-1 sm:flex-none px-6 py-2.5 transition-all text-sm font-bold rounded-lg ${viewMode === 'list'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                      }`}
                  >
                    Lista
                  </button>
                </div>
              </div>

              {/* Advanced Filters */}
              <div className="mb-8">
                <AdvancedFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                  availableMakes={uniqueMakes}
                />
              </div>

              {/* El comparador ahora es un Sticky Bar al final de la página */}

              {/* Listado de Vehículos - Siempre visible */}
              {loading && vehicles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border border-slate-100 shadow-sm">
                  <div className="relative w-20 h-20 mb-6">
                    <div className="absolute inset-0 border-4 border-blue-600/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <p className="text-slate-500 font-bold tracking-wide">Actualizando inventario...</p>
                </div>
              ) : filteredVehicles.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8 text-4xl shadow-inner">
                    🔍
                  </div>
                  <h3 className="text-3xl font-black mb-4 text-slate-900">Sin coincidencias exactas</h3>
                  <p className="text-slate-500 mb-10 max-w-sm mx-auto font-medium">
                    Prueba quitando algunos filtros o buscando un modelo más general.
                  </p>
                  <button
                    onClick={() => setFilters({
                      make: 'all',
                      model: '',
                      yearMin: '',
                      yearMax: '',
                      priceMin: '',
                      priceMax: '',
                      mileageMax: '',
                      fuelType: 'all',
                      transmission: 'all',
                      condition: 'all',
                      location: '',
                      bodyType: 'all',
                    })}
                    className="px-10 py-4 bg-slate-900 text-white rounded-2xl hover:bg-blue-600 font-bold transition-all shadow-xl hover:shadow-blue-500/20"
                  >
                    Reiniciar Búsqueda
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="flex items-center justify-between text-sm">
                    <p className="text-slate-500 font-bold">
                      Mostrando <span className="text-slate-900">{filteredVehicles.length}</span> resultados de <span className="text-slate-900">{vehicles.length}</span>
                    </p>
                  </div>

                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                      {filteredVehicles.map((vehicle, idx) => (
                        <Fragment key={vehicle.id}>

                          <div
                            className="bg-white rounded-[2.5rem] shadow-[0_15px_45px_-15px_rgba(0,0,0,0.08)] hover:shadow-[0_30px_70px_-20px_rgba(0,0,0,0.15)] transition-all duration-700 overflow-hidden group cursor-pointer border border-slate-100 flex flex-col hover:-translate-y-3 relative active:scale-95"
                            onClick={(e) => {
                              if ((e.target as HTMLElement).closest('.compare-checkbox') || (e.target as HTMLElement).closest('button')) return;
                              fetch(`/api/public/vehicles/${vehicle.id}/view`, { method: 'POST' }).catch(console.error);
                              window.location.href = `/${vehicle.tenantId}/vehicle/${vehicle.id}`;
                            }}
                          >
                            {/* Price Tag Overlay */}
                            <div className="absolute top-6 left-6 z-20 pointer-events-none">
                              <div className="bg-white/95 backdrop-blur-md px-5 py-2.5 rounded-2xl shadow-xl border border-white/50 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                                <span className="text-xl font-black tracking-tighter">
                                  {vehicle.currency} {vehicle.price.toLocaleString()}
                                </span>
                              </div>
                            </div>

                            {/* Image Container — panorámico + contain para foto más completa */}
                            <div className="relative w-full aspect-[16/10] min-h-[220px] bg-slate-100 overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent z-10 transition-opacity duration-500 opacity-40 group-hover:opacity-70 pointer-events-none"></div>
                              {(() => {
                                const src = getFirstPhoto(vehicle);
                                return src ? (
                                  <img
                                    src={src}
                                    alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                                    className="w-full h-full object-contain object-center scale-100 group-hover:scale-[1.02] transition-transform duration-[1.5s] ease-out"
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                    onError={handleImageError}
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center bg-slate-50 text-slate-200">
                                    <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                  </div>
                                );
                              })()}

                              {/* Stock Badge */}
                              <div className="absolute bottom-6 right-6 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 translate-y-4 group-hover:translate-y-0">
                                <span className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                                  #{vehicle.stockNumber || 'PREMIUM'}
                                </span>
                              </div>
                            </div>

                            {/* Card Content */}
                            <div className="p-10 flex-grow flex flex-col justify-between bg-white relative">
                              <div>
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="text-blue-600 font-black text-[10px] uppercase tracking-widest">{vehicle.condition === 'new' ? 'Nuevo' : 'Seminuevo'}</span>
                                  <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                                  <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">{vehicle.make}</span>
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 mb-6 group-hover:text-blue-600 transition-colors leading-tight">
                                  {vehicle.year} {vehicle.make} {vehicle.model}
                                </h3>

                                <div className="grid grid-cols-2 gap-4 mb-8">
                                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100/50">
                                    <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm text-blue-600">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    </div>
                                    <div>
                                      <span className="block text-[8px] font-black text-slate-400 uppercase tracking-tighter">Millas</span>
                                      <span className="block text-xs font-black text-slate-900">{vehicle.mileage ? vehicle.mileage.toLocaleString() : '0'}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100/50">
                                    <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm text-blue-600">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                    </div>
                                    <div>
                                      <span className="block text-[8px] font-black text-slate-400 uppercase tracking-tighter">Status</span>
                                      <span className="block text-xs font-black text-slate-900">CERTIFIED</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-8 border-t border-slate-100">
                                <button className="flex items-center gap-3 text-slate-900 group/btn font-black text-xs tracking-widest uppercase">
                                  <span className="relative">
                                    Ver Detalles
                                    <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 group-hover/btn:w-full transition-all duration-300"></div>
                                  </span>
                                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center group-hover/btn:bg-blue-600 transition-colors duration-300">
                                    <svg className="w-4 h-4 transform group-hover/btn:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                  </div>
                                </button>

                                <div className="compare-checkbox">
                                  <label className="relative flex items-center cursor-pointer group/check">
                                    <input
                                      type="checkbox"
                                      checked={selectedVehicles.includes(vehicle.id)}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        if (e.target.checked) {
                                          if (selectedVehicles.length < 3) {
                                            setSelectedVehicles([...selectedVehicles, vehicle.id]);
                                          } else {
                                            alert('Máximo 3 vehículos para comparar');
                                          }
                                        } else {
                                          setSelectedVehicles(selectedVehicles.filter(id => id !== vehicle.id));
                                        }
                                      }}
                                      className="peer sr-only"
                                    />
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border-2 transition-all shadow-sm ${selectedVehicles.includes(vehicle.id) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 border-slate-100 text-slate-300 group-hover/check:border-blue-200 group-hover/check:text-blue-400'}`}>
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Fragment>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {filteredVehicles.map((vehicle) => (
                        <div
                          key={vehicle.id}
                          className="bg-white rounded-[3rem] shadow-[0_15px_40px_-15px_rgba(0,0,0,0.05)] hover:shadow-[0_30px_70px_-20px_rgba(0,0,0,0.12)] transition-all duration-500 overflow-hidden group cursor-pointer border border-slate-100 flex flex-col md:flex-row h-auto md:h-72 hover:-translate-y-1.5"
                          onClick={(e) => {
                            if ((e.target as HTMLElement).closest('.compare-checkbox') || (e.target as HTMLElement).closest('button')) return;
                            fetch(`/api/public/vehicles/${vehicle.id}/view`, { method: 'POST' }).catch(console.error);
                            window.location.href = `/${vehicle.tenantId}/vehicle/${vehicle.id}`;
                          }}
                        >
                          {/* Image Section */}
                          <div className="relative w-full md:w-[420px] aspect-[16/10] md:aspect-auto md:min-h-[280px] overflow-hidden bg-slate-100 flex-shrink-0">
                            {(() => {
                              const src = getFirstPhoto(vehicle);
                              return src ? (
                                <img
                                  src={src}
                                  alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                                  className="w-full h-full object-contain object-center group-hover:scale-[1.02] transition-transform duration-1000 ease-out"
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                  onError={handleImageError}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-200">
                                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                              );
                            })()}

                            {/* Badges on Image */}
                            <div className="absolute top-6 left-6 z-10 flex flex-col gap-2">
                              <span className="bg-blue-600/90 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20">
                                {vehicle.condition === 'new' ? 'Nuevo' : 'Certificado'}
                              </span>
                              {vehicle.isFeatured && (
                                <span className="bg-amber-500/90 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20">
                                  Destacado
                                </span>
                              )}
                            </div>

                            {/* Compare Checkbox */}
                            <label className="absolute bottom-6 left-6 z-20 cursor-pointer group/check">
                              <input
                                type="checkbox"
                                checked={selectedVehicles.includes(vehicle.id)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  if (e.target.checked) {
                                    if (selectedVehicles.length < 3) {
                                      setSelectedVehicles([...selectedVehicles, vehicle.id]);
                                    } else {
                                      setComparisonError('Máximo 3 vehículos para comparar');
                                    }
                                  } else {
                                    setSelectedVehicles(selectedVehicles.filter(id => id !== vehicle.id));
                                  }
                                }}
                                className="peer sr-only"
                              />
                              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border-2 transition-all shadow-sm ${selectedVehicles.includes(vehicle.id) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white/80 backdrop-blur-md border-white/40 text-slate-400'}`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                              </div>
                            </label>
                          </div>

                          {/* Info Section */}
                          <div className="p-10 flex-grow flex flex-col justify-between">
                            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-blue-600 font-extrabold text-[10px] uppercase tracking-[0.2em]">{vehicle.make}</span>
                                  <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                                  <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">STOCK: #{vehicle.stockNumber || 'PREMIUM'}</span>
                                </div>
                                <h3 className="text-3xl font-black text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight leading-tight">
                                  {vehicle.year} {vehicle.make} {vehicle.model}
                                </h3>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-3xl font-black text-slate-900 tracking-tighter">
                                  {vehicle.currency} {vehicle.price.toLocaleString()}
                                </span>
                                <span className="text-blue-500 text-[10px] font-black uppercase tracking-widest mt-1">Precio Online</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                              <div className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100/50">
                                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                <span className="text-xs font-bold text-slate-600">{vehicle.mileage ? vehicle.mileage.toLocaleString() : '0'} mi</span>
                              </div>
                              <div className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100/50">
                                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                                <span className="text-xs font-bold text-slate-600">{vehicle.specifications?.transmission || 'Auto'}</span>
                              </div>
                              <div className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100/50">
                                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.99 7.99 0 0120 13a7.989 7.989 0 01-2.343 5.657z" /></svg>
                                <span className="text-xs font-bold text-slate-600">{vehicle.specifications?.fuelType || 'Gas'}</span>
                              </div>
                              <div className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100/50">
                                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                                <span className="text-xs font-bold text-slate-600 whitespace-nowrap overflow-hidden text-ellipsis">{vehicle.location || 'Nacional'}</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <button className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-blue-600 transition-all shadow-xl hover:shadow-blue-500/20 active:scale-95">
                                  Ver Detalles
                                </button>
                                <button className="p-4 bg-slate-50 text-slate-400 rounded-2xl border border-slate-100 hover:text-blue-600 hover:bg-white transition-all">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                </button>
                              </div>
                              <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">{vehicle.tenantName || 'Dealer Premium'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <InventoryFinderCta publishedVehicleCount={vehicles.length} />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <FinanceCalculator />

      <ExclusiveOffersLandingSection />

      <QuickListingsSection quickListingPath={freeListingsCta.quickListingPath} />

      <section id="dealers" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {featuredDealers.length > 0 ? (
            <FeaturedDealers dealers={featuredDealers.map((d: any) => ({
              id: d.id,
              name: d.name || d.tenantName,
              photo: d.photo,
              rating: d.dealerRating,
              ratingCount: d.dealerRatingCount,
              vehicleCount: d.publishedVehiclesCount,
              location: d.location,
            }))} />
          ) : (
            <div className="text-center py-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Concesionarios
              </h2>
              <p className="text-xl text-gray-600">
                No hay concesionarios disponibles en este momento
              </p>
            </div>
          )}
        </div>
      </section>

      <ReviewsSection />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BetweenContentBanner />
      </div>

      <SponsoredContent />

      <WhyChooseUsLandingSection />

      <section id="contact" className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
              ¿Necesitas Ayuda?
            </h2>
            <p className="text-lg text-slate-600 font-normal max-w-2xl mx-auto">
              Nuestro equipo está listo para ayudarte a encontrar el vehículo perfecto
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <a
              href={`https://wa.me/${siteInfo.contact.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-900 text-white p-8 rounded-lg text-center hover:bg-slate-800 transition-all shadow-md hover:shadow-lg"
            >
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">WhatsApp</h3>
              <p className="text-sm text-white/80 font-normal">Escríbenos directamente</p>
            </a>
            <a
              href={`tel:${siteInfo.contact.phone.replace(/\s/g, '')}`}
              className="bg-slate-900 text-white p-8 rounded-lg text-center hover:bg-slate-800 transition-all shadow-md hover:shadow-lg"
            >
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">Llamada</h3>
              <p className="text-sm text-white/80 font-normal">Llámanos ahora</p>
            </a>
            <button
              onClick={() => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-slate-900 text-white p-8 rounded-lg text-center hover:bg-slate-800 transition-all shadow-md hover:shadow-lg"
            >
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">Formulario</h3>
              <p className="text-sm text-white/80 font-normal">Completa nuestro formulario</p>
            </button>
          </div>

          {/* Formulario de Contacto */}
          <div id="contact-form" className="bg-white rounded-lg shadow-lg p-8 border border-slate-200">
            <h3 className="text-2xl font-semibold mb-6 text-center text-slate-900">Formulario de Contacto</h3>
            <ContactForm />
          </div>
        </div>
      </section>

      <LandingFooter />
      {/* Comparison Error Notification */}
      {comparisonError && (
        <div className="fixed top-24 right-8 z-[100] animate-fade-in-right">
          <div className="bg-red-600/90 backdrop-blur-xl text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-red-500/50">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="font-black text-sm uppercase tracking-widest">Error de Selección</p>
              <p className="text-sm font-bold opacity-90">{comparisonError}</p>
            </div>
            <button onClick={() => setComparisonError(null)} className="ml-4 hover:rotate-90 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* Sticky Comparison Bar - Ultra Premium */}
      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[90] transition-all duration-700 ease-out w-[95%] max-w-4xl ${selectedVehicles.length > 0 ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-32 opacity-0 scale-95 pointer-events-none'}`}>
        <div className="bg-slate-900/90 backdrop-blur-2xl px-1 sm:px-1 py-1 rounded-[2.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)] border border-white/10 overflow-hidden relative group">
          {/* Background effects */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/10 to-transparent opacity-50"></div>

          <div className="relative z-10 flex items-center justify-between pl-8 pr-2 py-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full text-white shadow-xl shadow-blue-500/30">
                <span className="text-xl font-black">{selectedVehicles.length}</span>
              </div>
              <div className="hidden sm:block">
                <h4 className="text-white font-black text-xs uppercase tracking-[0.2em] mb-1">Comparar Vehículos</h4>
                <p className="text-white/50 text-xs font-bold">{selectedVehicles.length === 3 ? 'Selección Completa' : `Agrega ${3 - selectedVehicles.length} más para una mejor comparación`}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedVehicles([])}
                className="text-white/40 hover:text-white px-6 py-3 font-black text-[10px] uppercase tracking-widest transition-all"
              >
                Limpiar Todo
              </button>
              <button
                onClick={() => {
                  window.location.href = `/compare?vehicles=${selectedVehicles.join(',')}`;
                }}
                className="bg-white text-slate-900 px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-500 hover:text-white transition-all shadow-2xl shadow-white/5 hover:shadow-blue-500/20 active:scale-95"
              >
                Comparar Ahora
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
