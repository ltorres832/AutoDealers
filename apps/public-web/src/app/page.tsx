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
import ReviewsSection from '../components/ReviewsSection';
import SponsoredContent from '../components/SponsoredContent';
import HeroBanner from '../components/HeroBanner';
import SidebarBanner from '../components/SidebarBanner';
import BetweenContentBanner from '../components/BetweenContentBanner';
import ContactForm from '../components/ContactForm';
import { SITE_INFO as DEFAULT_SITE_INFO, getSiteInfo } from '../config/site-info';

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
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any[]>([]);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
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
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [featuredDealers, setFeaturedDealers] = useState<any[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [landingConfig, setLandingConfig] = useState<any>(null);
  const [scrolled, setScrolled] = useState(false);
  const [siteInfo, setSiteInfo] = useState(DEFAULT_SITE_INFO);
  const fetchingVehiclesRef = useRef(false);

  // Función helper para agregar logs al panel de debug
  const addDebugLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setDebugLogs(prev => [...prev.slice(-49), logMessage]); // Mantener últimos 50 logs
  }, []);

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
        // Normalizar: convertir a string, quitar espacios, convertir a minúsculas
        const normalizedBodyType = String(bodyType).trim().toLowerCase();
        if (normalizedBodyType && normalizedBodyType !== 'undefined' && normalizedBodyType !== 'null') {
          counts[normalizedBodyType] = (counts[normalizedBodyType] || 0) + 1;
        }
      }
    });
    return counts;
  }, [vehicles]);

  // Log temporal para debug de bodyTypes
  useEffect(() => {
    if (vehicles.length > 0) {
      const bodyTypesFound: string[] = [];
      const vehiclesWithoutBodyType: string[] = [];
      vehicles.forEach((v: any, index: number) => {
        const bodyType = v.bodyType || v.specifications?.bodyType;
        if (bodyType) {
          const normalized = String(bodyType).trim().toLowerCase();
          if (normalized && !bodyTypesFound.includes(normalized)) {
            bodyTypesFound.push(normalized);
          }
          addDebugLog(`📊 Vehículo ${index + 1}: ${v.year} ${v.make} ${v.model} - bodyType: "${bodyType}" (normalizado: "${normalized}")`);
        } else {
          vehiclesWithoutBodyType.push(`${v.year} ${v.make} ${v.model}`);
          addDebugLog(`⚠️ Vehículo ${index + 1}: ${v.year} ${v.make} ${v.model} - NO TIENE bodyType`);
        }
      });
      addDebugLog(`📊 BodyTypes encontrados: ${bodyTypesFound.length > 0 ? bodyTypesFound.join(', ') : 'NINGUNO'}`);
      addDebugLog(`📊 Conteos por tipo: ${JSON.stringify(vehicleCountsByBodyType)}`);
      if (vehiclesWithoutBodyType.length > 0) {
        addDebugLog(`⚠️ ${vehiclesWithoutBodyType.length} vehículos SIN bodyType: ${vehiclesWithoutBodyType.join(', ')}`);
      }
    }
  }, [vehicles, vehicleCountsByBodyType, addDebugLog]);

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
        const dealers = (data.dealers || []).sort((a: any, b: any) => {
          const aScore = (a.dealerRating || 0) * 10 + (a.publishedVehiclesCount || 0);
          const bScore = (b.dealerRating || 0) * 10 + (b.publishedVehiclesCount || 0);
          return bScore - aScore;
        }).slice(0, 6);
        setFeaturedDealers(dealers);
        // Guardar en sessionStorage
        try {
          sessionStorage.setItem('dealers_cache', JSON.stringify(dealers));
          sessionStorage.setItem('dealers_cache_timestamp', Date.now().toString());
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
      addDebugLog('⚠️ Fetch ya en progreso, ignorando llamada duplicada');
      return;
    }
    
    try {
      fetchingVehiclesRef.current = true;
      addDebugLog('🚀 Iniciando fetch de vehículos...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout (aumentado para dar más tiempo al servidor)
      
      const response = await fetch('/api/public/vehicles?status=available', {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
      addDebugLog(`📡 Respuesta recibida: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        addDebugLog(`📦 Datos recibidos. Tipo: ${typeof data.vehicles}, Es array: ${Array.isArray(data.vehicles)}`);
        addDebugLog(`✅ API devolvió: ${data.vehicles?.length || 0} vehículos`);
        
        if (!data.vehicles || !Array.isArray(data.vehicles)) {
          addDebugLog(`❌ ERROR: data.vehicles no es un array. Tipo: ${typeof data.vehicles}`);
          addDebugLog(`❌ Datos recibidos: ${JSON.stringify(data).substring(0, 200)}`);
          setVehicles([]);
          setFilteredVehicles([]);
          setLoading(false);
          return;
        }
        
        const debugData: any[] = [];
        const vehiclesWithPhotos = (data.vehicles || []).map((vehicle: any) => {
          addDebugLog(`📸 Procesando vehículo ${vehicle.id}: ${vehicle.year} ${vehicle.make} ${vehicle.model}`);
          addDebugLog(`📸 Fotos originales: ${vehicle.photos?.length || 0}, Tipo: ${typeof vehicle.photos}, Es array: ${Array.isArray(vehicle.photos)}`);
          
          const photos = Array.isArray(vehicle.photos) 
            ? vehicle.photos.filter((photo: string) => 
                photo && typeof photo === 'string' && photo.trim() !== '' && photo !== 'undefined' && !photo.includes('undefined')
              )
            : [];
          
          addDebugLog(`📸 Fotos después del filtro: ${photos.length}`);
          if (photos.length > 0) {
            addDebugLog(`📸 Primera foto: ${photos[0].substring(0, 100)}...`);
          } else if (vehicle.photos && vehicle.photos.length > 0) {
            addDebugLog(`⚠️ Fotos filtradas. Ejemplo original: ${JSON.stringify(vehicle.photos[0])}`);
          }
          
          const stockNumber = vehicle.stockNumber || vehicle.specifications?.stockNumber;
          
          debugData.push({
            id: vehicle.id,
            name: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
            stockNumber: stockNumber || 'NO TIENE',
            photosCount: photos.length,
            originalPhotosCount: vehicle.photos?.length || 0,
            firstPhoto: photos[0] || 'NO TIENE',
            publishedOnPublicPage: vehicle.publishedOnPublicPage,
            status: vehicle.status,
          });
          
          return {
            ...vehicle,
            stockNumber,
            photos,
          };
        });
        
        // FORZAR ACTUALIZACIÓN INMEDIATA
        addDebugLog(`💾 Estableciendo ${vehiclesWithPhotos.length} vehículos en estado`);
        if (vehiclesWithPhotos.length > 0) {
          const firstVehicle = vehiclesWithPhotos[0];
          addDebugLog(`📋 Primer vehículo: ${firstVehicle.year} ${firstVehicle.make} ${firstVehicle.model} (ID: ${firstVehicle.id})`);
          addDebugLog(`📸 Primer vehículo tiene ${firstVehicle.photos?.length || 0} fotos`);
          if (firstVehicle.photos && firstVehicle.photos.length > 0) {
            addDebugLog(`📸 URL primera foto: ${firstVehicle.photos[0]}`);
          } else {
            addDebugLog(`⚠️ Primer vehículo NO tiene fotos`);
          }
        }
        setVehicles(vehiclesWithPhotos);
        setFilteredVehicles(vehiclesWithPhotos);
        setDebugInfo(debugData);
        setLoading(false);
        
        // Guardar en sessionStorage para persistencia
        try {
          sessionStorage.setItem('vehicles_cache', JSON.stringify(vehiclesWithPhotos));
          sessionStorage.setItem('vehicles_cache_timestamp', Date.now().toString());
          addDebugLog(`💾 Vehículos guardados en caché (${vehiclesWithPhotos.length} vehículos)`);
        } catch (e) {
          // Ignorar errores de sessionStorage (puede estar deshabilitado)
        }
        
        addDebugLog(`✅ Estado actualizado. Vehículos en estado: ${vehiclesWithPhotos.length}`);
      } else {
        addDebugLog(`❌ Respuesta no OK: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        addDebugLog(`❌ Cuerpo de error: ${errorText.substring(0, 200)}`);
        setVehicles([]);
        setFilteredVehicles([]);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        addDebugLog(`❌ Error fetching vehicles: ${error.message || error}`);
      } else {
        addDebugLog('⏱️ Fetch cancelado por timeout - intentando cargar desde caché...');
        // Si hay timeout, intentar cargar desde caché como último recurso
        try {
          const savedVehicles = sessionStorage.getItem('vehicles_cache');
          if (savedVehicles) {
            const parsedVehicles = JSON.parse(savedVehicles);
            if (Array.isArray(parsedVehicles) && parsedVehicles.length > 0) {
              addDebugLog(`💾 Cargando ${parsedVehicles.length} vehículos desde caché (timeout)`);
              setVehicles(parsedVehicles);
              setFilteredVehicles(parsedVehicles);
              setLoading(false);
              fetchingVehiclesRef.current = false;
              return;
            }
          }
        } catch (cacheError) {
          addDebugLog(`⚠️ Error cargando desde caché: ${cacheError}`);
        }
      }
      // Solo limpiar si realmente no hay datos
      const hasCachedData = sessionStorage.getItem('vehicles_cache');
      if (!hasCachedData) {
        setVehicles([]);
        setFilteredVehicles([]);
      }
    } finally {
      setLoading(false);
      fetchingVehiclesRef.current = false;
      addDebugLog('🏁 fetchVehicles terminado');
    }
  }, [addDebugLog]);

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
      const savedVehicles = sessionStorage.getItem('vehicles_cache');
      const savedTimestamp = sessionStorage.getItem('vehicles_cache_timestamp');
      
      if (savedVehicles && savedTimestamp) {
        const timestamp = parseInt(savedTimestamp);
        const now = Date.now();
        const cacheAge = now - timestamp;
        
        if (cacheAge < CACHE_MAX_AGE) {
          try {
            const parsedVehicles = JSON.parse(savedVehicles);
            if (Array.isArray(parsedVehicles) && parsedVehicles.length > 0) {
              addDebugLog(`💾 Cargando ${parsedVehicles.length} vehículos desde caché (${Math.round(cacheAge / 1000)}s de antigüedad)`);
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
          addDebugLog(`⏰ Caché de vehículos expirado (${Math.round(cacheAge / 1000)}s), recargando...`);
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
      const savedDealers = sessionStorage.getItem('dealers_cache');
      const savedTimestamp = sessionStorage.getItem('dealers_cache_timestamp');
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

  // FORZAR RE-RENDER CUANDO CAMBIEN LOS VEHÍCULOS
  useEffect(() => {
    addDebugLog(`🔄 Estado de vehicles cambió: ${vehicles.length} vehículos`);
    if (vehicles.length > 0) {
      addDebugLog(`✅ Vehículos en estado: ${vehicles.length}`);
      addDebugLog(`📋 Primer vehículo: ${vehicles[0].year} ${vehicles[0].make} ${vehicles[0].model}`);
    } else {
      addDebugLog('⚠️ NO HAY VEHÍCULOS EN ESTADO');
    }
  }, [vehicles, addDebugLog]);

  return (
    <div className="min-h-screen bg-white">
      {/* PANEL DE DEBUG TEMPORAL - QUITAR DESPUÉS */}
      <button
        onClick={() => setShowDebug(!showDebug)}
        className="fixed bottom-4 left-4 z-[9999] bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-red-700 transition-all font-bold"
        style={{ fontSize: '14px' }}
      >
        🐛 DEBUG
      </button>
      
      {showDebug && (
        <div className="fixed bottom-20 left-4 z-[9999] bg-white border-4 border-red-600 rounded-lg shadow-2xl p-6 max-w-md max-h-[80vh] overflow-auto">
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-red-600 border-b-2 border-red-600 pb-2">
              🔍 INFORMACIÓN DE DEBUG
            </h3>
            
            <div className="space-y-2 text-sm">
              <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-500">
                <p className="font-bold text-blue-900">🚗 Vehículos:</p>
                <p className="text-blue-700">
                  Total cargados: <span className="font-bold text-xl">{vehicles.length}</span>
                </p>
                <p className="text-blue-700">
                  Filtrados visibles: <span className="font-bold text-xl">{filteredVehicles.length}</span>
                </p>
              </div>

              <div className="bg-green-50 p-3 rounded border-l-4 border-green-500">
                <p className="font-bold text-green-900">🏢 Dealers:</p>
                <p className="text-green-700">
                  Total: <span className="font-bold text-xl">{featuredDealers.length}</span>
                </p>
              </div>

              <div className="bg-purple-50 p-3 rounded border-l-4 border-purple-500">
                <p className="font-bold text-purple-900">📢 Banners:</p>
                <p className="text-purple-700">
                  Total: <span className="font-bold text-xl">{banners.length}</span>
                </p>
              </div>

              <div className="bg-yellow-50 p-3 rounded border-l-4 border-yellow-500">
                <p className="font-bold text-yellow-900">🎁 Promociones:</p>
                <p className="text-yellow-700">
                  Total: <span className="font-bold text-xl">{promotions.length}</span>
                </p>
              </div>

              <div className="bg-gray-50 p-3 rounded border-l-4 border-gray-500">
                <p className="font-bold text-gray-900">⏳ Estado:</p>
                <p className="text-gray-700">
                  Loading: <span className="font-bold">{loading ? '✅ SÍ' : '❌ NO'}</span>
                </p>
              </div>

              {debugInfo.length > 0 && (
                <div className="bg-indigo-50 p-3 rounded border-l-4 border-indigo-500 max-h-64 overflow-auto">
                  <p className="font-bold text-indigo-900 mb-2">📋 Detalles de Vehículos:</p>
                  {debugInfo.slice(0, 5).map((info, idx) => (
                    <div key={idx} className="text-xs text-indigo-700 mb-2 bg-white p-2 rounded">
                      <p><strong>{info.name}</strong></p>
                      <p>ID: {info.id}</p>
                      <p>Stock: {info.stockNumber}</p>
                      <p>Fotos: {info.photosCount}</p>
                      <p>Publicado: {info.publishedOnPublicPage ? '✅' : '❌'}</p>
                      <p>Status: {info.status}</p>
                    </div>
                  ))}
                  {debugInfo.length > 5 && (
                    <p className="text-xs text-indigo-600 italic">... y {debugInfo.length - 5} más</p>
                  )}
                </div>
              )}

              <div className="bg-black text-green-400 p-3 rounded border-l-4 border-green-500 max-h-96 overflow-auto font-mono text-xs">
                <p className="font-bold text-green-300 mb-2">📜 LOGS DE DEBUG:</p>
                {debugLogs.length === 0 ? (
                  <p className="text-gray-500 italic">No hay logs aún...</p>
                ) : (
                  <div className="space-y-1">
                    {debugLogs.map((log, idx) => (
                      <div key={idx} className="text-green-400 whitespace-pre-wrap break-words">
                        {log}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => {
                fetchVehicles();
                fetchFeaturedDealers();
                fetchBanners();
                fetchPromotions();
              }}
              className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition font-bold"
            >
              🔄 RECARGAR DATOS
            </button>
          </div>
        </div>
      )}
      {/* FIN PANEL DE DEBUG TEMPORAL */}
      
      {/* Navbar Profesional y Corporativo */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-md border-b border-gray-200' : 'bg-white/80 backdrop-blur-sm'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg tracking-tight">AD</span>
                </div>
                <div>
                  <span className="text-xl font-bold text-slate-900 tracking-tight">
                    AutoDealers
                  </span>
                  <p className="text-xs text-gray-500 font-normal">Plataforma de Confianza</p>
                </div>
              </div>
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

      {/* Hero Banner */}
      <HeroBanner />

      {/* Hero Section Ultra Profesional con Imagen de Fondo */}
      <section className="relative pt-32 pb-32 min-h-[90vh] flex items-center overflow-hidden">
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
            
            {/* Hero Search Component con diseño premium */}
            <div className="max-w-4xl mx-auto mb-16">
              <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
                <HeroSearch onSearch={(query) => {
                  setFilters(prev => ({ ...prev, model: query }));
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

      {/* Vehículos Destacados - SIEMPRE VISIBLE */}
      <section className="py-16 bg-gradient-to-br from-gray-50 via-white to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full mb-4">
              <span className="text-blue-600 font-semibold text-sm">✨ NUEVO</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Recién Agregados
            </h2>
            <p className="text-xl text-gray-600">
              Los vehículos más recientes en nuestro inventario
            </p>
          </div>

          {/* AUTOS - SIEMPRE VISIBLE - NO TOCAR HERO */}
          {vehicles && Array.isArray(vehicles) && vehicles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vehicles.slice(0, 6).map((vehicle: any) => (
                <div
                  key={vehicle.id}
                  className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all overflow-hidden group cursor-pointer border-2 border-transparent hover:border-blue-500 relative"
                  onClick={() => {
                    window.location.href = `/${vehicle.tenantId}/vehicle/${vehicle.id}`;
                  }}
                >
                  <div className="absolute top-4 right-4 z-10 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                    <span>🆕</span>
                    <span>Nuevo</span>
                  </div>

                  {vehicle.photos && vehicle.photos.length > 0 && vehicle.photos[0] ? (
                    <div className="relative h-56 bg-gray-200">
                      <img
                        src={vehicle.photos[0].trim()}
                        alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3E🚗%3C/text%3E%3C/svg%3E';
                          target.onerror = null;
                        }}
                      />
                    </div>
                  ) : (
                    <div className="h-56 bg-gray-200 flex items-center justify-center">
                      <div className="text-gray-400 text-6xl">🚗</div>
                    </div>
                  )}

                  <div className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </h3>
                        {vehicle.stockNumber && (
                          <span className="text-xs text-gray-500">Stock: #{vehicle.stockNumber}</span>
                        )}
                      </div>
                      <p className="text-2xl font-bold text-green-600">
                        {vehicle.currency} {vehicle.price.toLocaleString()}
                      </p>
                    </div>

                    {vehicle.mileage && (
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                        <span>📏 {vehicle.mileage.toLocaleString()} millas</span>
                      </div>
                    )}

                    <button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold transition-all transform hover:scale-105">
                      Ver Detalles
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-yellow-50 border-2 border-yellow-200 rounded-lg p-8">
              <p className="text-lg font-semibold text-yellow-800 mb-2">
                {loading ? '⏳ Cargando vehículos...' : `⚠️ No hay vehículos (Estado: ${vehicles?.length || 0})`}
              </p>
              {!loading && (
                <div className="text-sm text-yellow-700">
                  <p>Revisa la consola (F12) - Busca "✅ API devolvió"</p>
                  <p className="mt-1">El servidor dice que hay 7 vehículos disponibles</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Listado General de Vehículos con Sidebar */}
      <section id="vehicles" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar con anuncios */}
            <aside className="lg:col-span-1 order-2 lg:order-1">
              <div className="sticky top-24">
                <SidebarBanner />
              </div>
            </aside>
            
            {/* Contenido principal */}
            <div className="lg:col-span-3 order-1 lg:order-2">
              <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
                  Catálogo Completo
                </h2>
                <p className="text-xl text-gray-600">
                  {filteredVehicles.length} vehículos disponibles para ti
                </p>
              </div>

              {/* Controles de vista y ordenamiento */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex items-center gap-4">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="border border-slate-300 rounded-md px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 bg-white font-medium text-sm text-slate-700"
                  >
                    <option value="price-asc">Precio: Menor a Mayor</option>
                    <option value="price-desc">Precio: Mayor a Menor</option>
                    <option value="year-desc">Año: Más Reciente</option>
                    <option value="mileage-asc">Millas: Menor a Mayor</option>
                  </select>
                </div>
                
                <div className="flex border border-slate-300 rounded-md overflow-hidden bg-white">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-4 py-2.5 transition-all text-sm font-medium ${
                      viewMode === 'grid' 
                        ? 'bg-slate-900 text-white' 
                        : 'bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Grid
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-4 py-2.5 transition-all text-sm font-medium border-l border-slate-300 ${
                      viewMode === 'list' 
                        ? 'bg-slate-900 text-white' 
                        : 'bg-white text-slate-700 hover:bg-slate-50'
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
              
              {/* Comparador de Vehículos */}
              {selectedVehicles.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 mb-8">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="font-semibold text-lg text-slate-900 mb-1">
                        {selectedVehicles.length} vehículo(s) seleccionado(s)
                      </h3>
                      <p className="text-sm text-slate-600">
                        Compara características y precios lado a lado
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          window.location.href = `/compare?vehicles=${selectedVehicles.join(',')}`;
                        }}
                        className="bg-slate-900 text-white px-6 py-2.5 rounded-md hover:bg-slate-800 font-medium text-sm transition-all"
                      >
                        Comparar Ahora
                      </button>
                      <button
                        onClick={() => setSelectedVehicles([])}
                        className="bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-300 font-medium transition-all"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Listado de Vehículos - Siempre visible */}
              {loading && vehicles.length === 0 ? (
                <div className="flex justify-center py-20">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
                  <p className="ml-4 text-slate-600">Cargando vehículos...</p>
                </div>
              ) : filteredVehicles.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-semibold mb-3 text-slate-900">No se encontraron vehículos</h3>
                  <p className="text-slate-600 mb-6 max-w-md mx-auto">
                    Intenta ajustar los filtros de búsqueda para encontrar más resultados
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
                    className="bg-slate-900 text-white px-6 py-3 rounded-md hover:bg-slate-800 font-medium text-sm transition-all"
                  >
                    Limpiar Filtros
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-slate-600 mb-6 text-sm font-medium">
                    Mostrando {filteredVehicles.length} de {vehicles.length} vehículos disponibles
                  </p>
                  
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredVehicles.map((vehicle) => (
                        <div
                          key={vehicle.id}
                          className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group cursor-pointer relative border-2 border-slate-200 hover:border-blue-500 transform hover:-translate-y-2"
                          onClick={(e) => {
                            if ((e.target as HTMLElement).closest('.compare-checkbox')) return;
                            fetch(`/api/public/vehicles/${vehicle.id}/view`, { method: 'POST' }).catch(console.error);
                            window.location.href = `/${vehicle.tenantId}/vehicle/${vehicle.id}`;
                          }}
                        >
                          {/* Checkbox para comparar */}
                          <div className="absolute top-3 left-3 z-10 compare-checkbox">
                            <input
                              type="checkbox"
                              checked={selectedVehicles.includes(vehicle.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                if (e.target.checked) {
                                  if (selectedVehicles.length < 3) {
                                    setSelectedVehicles([...selectedVehicles, vehicle.id]);
                                  } else {
                                    alert('Solo puedes comparar hasta 3 vehículos');
                                  }
                                } else {
                                  setSelectedVehicles(selectedVehicles.filter(id => id !== vehicle.id));
                                }
                              }}
                              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                            />
                          </div>
                          
                          {/* Imagen del vehículo */}
                          {vehicle.photos && Array.isArray(vehicle.photos) && vehicle.photos.length > 0 && vehicle.photos[0] ? (
                            <div className="relative h-56 bg-gray-200 overflow-hidden">
                              <img
                                src={vehicle.photos[0].trim()}
                                alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3E🚗%3C/text%3E%3C/svg%3E';
                                  target.onerror = null;
                                }}
                              />
                              {vehicle.photos.length > 1 && (
                                <div className="absolute top-3 right-3 bg-black/70 text-white px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm">
                                  +{vehicle.photos.length - 1} fotos
                                </div>
                              )}
                              {(vehicle as any).stockNumber && (
                                <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-bold text-blue-600">
                                  #{(vehicle as any).stockNumber}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="h-56 bg-slate-100 flex items-center justify-center relative">
                              <svg className="w-16 h-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-md text-xs text-slate-600 font-medium border border-slate-200">
                                Sin fotos
                              </div>
                            </div>
                          )}
                          
                          {/* Información del vehículo */}
                          <div className="p-5">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-bold text-lg group-hover:text-blue-600 transition line-clamp-2 flex-1">
                                {vehicle.year} {vehicle.make} {vehicle.model}
                              </h3>
                            </div>
                            <p className="text-3xl font-extrabold text-green-600 mb-4">
                              {vehicle.currency} {vehicle.price.toLocaleString()}
                            </p>
                            <div className="flex flex-wrap gap-3 mb-4 text-xs text-gray-600">
                              {vehicle.mileage && (
                                <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">📏 {vehicle.mileage.toLocaleString()} km</span>
                              )}
                              {vehicle.specifications?.transmission && (
                                <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">⚙️ {vehicle.specifications.transmission}</span>
                              )}
                              {vehicle.specifications?.fuelType && (
                                <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">⛽ {vehicle.specifications.fuelType}</span>
                              )}
                            </div>
                            {vehicle.tenantName && (
                              <p className="text-xs text-gray-500 mb-3 font-medium">De: {vehicle.tenantName}</p>
                            )}
                            <p className="text-sm text-gray-700 line-clamp-2 mb-4">
                              {vehicle.description}
                            </p>
                            <button className="w-full bg-slate-900 text-white px-4 py-3 rounded-md hover:bg-slate-800 font-medium text-sm transition-all">
                              Ver Detalles
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {filteredVehicles.map((vehicle) => (
                        <div
                          key={vehicle.id}
                          className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group cursor-pointer relative flex border border-gray-100"
                          onClick={(e) => {
                            if ((e.target as HTMLElement).closest('.compare-checkbox')) return;
                            fetch(`/api/public/vehicles/${vehicle.id}/view`, { method: 'POST' }).catch(console.error);
                            window.location.href = `/${vehicle.tenantId}/vehicle/${vehicle.id}`;
                          }}
                        >
                          {/* Imagen */}
                          <div className="w-80 h-56 flex-shrink-0 relative">
                            {vehicle.photos && vehicle.photos.length > 0 && vehicle.photos[0] ? (
                              <img
                                src={vehicle.photos[0].trim()}
                                alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3E🚗%3C/text%3E%3C/svg%3E';
                                  target.onerror = null;
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                <div className="text-gray-400 text-6xl">🚗</div>
                              </div>
                            )}
                            {/* Checkbox */}
                            <div className="absolute top-3 left-3 compare-checkbox">
                              <input
                                type="checkbox"
                                checked={selectedVehicles.includes(vehicle.id)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  if (e.target.checked) {
                                    if (selectedVehicles.length < 3) {
                                      setSelectedVehicles([...selectedVehicles, vehicle.id]);
                                    } else {
                                      alert('Solo puedes comparar hasta 3 vehículos');
                                    }
                                  } else {
                                    setSelectedVehicles(selectedVehicles.filter(id => id !== vehicle.id));
                                  }
                                }}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                              />
                            </div>
                          </div>
                          
                          {/* Información */}
                          <div className="flex-1 p-6">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                  {vehicle.year} {vehicle.make} {vehicle.model}
                                </h3>
                                <p className="text-4xl font-extrabold text-green-600 mb-4">
                                  {vehicle.currency} {vehicle.price.toLocaleString()}
                                </p>
                              </div>
                              {(vehicle as any).stockNumber && (
                                <span className="text-xs font-bold bg-blue-100 text-blue-800 px-3 py-1.5 rounded-lg">
                                  #{(vehicle as any).stockNumber}
                                </span>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                              {vehicle.mileage && (
                                <div className="bg-gray-50 p-3 rounded-lg">
                                  <div className="text-gray-600 text-xs mb-1">Millas</div>
                                  <div className="font-bold">{vehicle.mileage.toLocaleString()}</div>
                                </div>
                              )}
                              {vehicle.specifications?.transmission && (
                                <div className="bg-gray-50 p-3 rounded-lg">
                                  <div className="text-gray-600 text-xs mb-1">Transmisión</div>
                                  <div className="font-bold">{vehicle.specifications.transmission}</div>
                                </div>
                              )}
                              {vehicle.specifications?.fuelType && (
                                <div className="bg-gray-50 p-3 rounded-lg">
                                  <div className="text-gray-600 text-xs mb-1">Combustible</div>
                                  <div className="font-bold">{vehicle.specifications.fuelType}</div>
                                </div>
                              )}
                            </div>
                            
                            <p className="text-gray-700 mb-6 line-clamp-2">
                              {vehicle.description}
                            </p>
                            
                            <div className="flex gap-3">
                              <button className="bg-slate-900 text-white px-8 py-3 rounded-md hover:bg-slate-800 font-medium text-sm transition-all">
                                Ver Detalles
                              </button>
                              <button className="border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 font-semibold transition-all">
                                Contactar
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Calculadora de Financiamiento */}
      <FinanceCalculator />

      {/* Sección de Promociones Premium - Diseño Profesional */}
      <section id="promotions" className="py-24 bg-slate-50 relative overflow-hidden border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 rounded-full mb-6">
              <span className="text-white font-semibold text-xs uppercase tracking-wider">Promociones Especiales</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
              Ofertas Exclusivas
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto font-normal">
              Promociones verificadas de nuestros concesionarios certificados
            </p>
          </div>
          
          {promotions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {promotions.slice(0, 12).map((promotion, index) => (
                <div
                  key={promotion.id}
                  onClick={() => {
                    if (promotion.vehicleId) {
                      window.location.href = `/${promotion.tenantId}/vehicle/${promotion.vehicleId}`;
                    }
                  }}
                  className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden border-2 border-transparent hover:border-yellow-400 transform hover:-translate-y-2"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {promotion.imageUrl ? (
                    <div className="relative h-56 overflow-hidden">
                      <img
                        src={promotion.imageUrl}
                        alt={promotion.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                      <div className="absolute top-4 right-4">
                        <span className="px-3 py-1.5 bg-amber-500 text-white text-xs font-semibold rounded uppercase tracking-wide">
                          Premium
                        </span>
                      </div>
                      {promotion.discount && (
                        <div className="absolute bottom-4 left-4">
                          <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                              {promotion.discount.type === 'percentage'
                                ? `${promotion.discount.value}% OFF`
                                : `$${promotion.discount.value} OFF`}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="relative h-56 bg-gradient-to-br from-yellow-100 via-orange-100 to-pink-100 flex items-center justify-center">
                      <div className="absolute top-4 right-4">
                        <span className="px-3 py-1.5 bg-amber-500 text-white text-xs font-semibold rounded uppercase tracking-wide">
                          Premium
                        </span>
                      </div>
                      <svg className="w-16 h-16 text-slate-300 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                      </svg>
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="font-bold text-xl mb-2 group-hover:text-blue-600 transition line-clamp-2">
                      {promotion.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{promotion.description}</p>
                    {promotion.tenantName && (
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {promotion.tenantName.charAt(0)}
                        </div>
                        <p className="text-xs text-gray-500 font-medium">De: {promotion.tenantName}</p>
                      </div>
                    )}
                    {((promotion.sellerRating && promotion.sellerRating > 0) || (promotion.dealerRating && promotion.dealerRating > 0)) && (
                      <div className="mb-4">
                        <StarRating
                          rating={promotion.sellerRating || promotion.dealerRating || 0}
                          count={promotion.sellerRatingCount || promotion.dealerRatingCount || 0}
                          size="sm"
                          showCount={true}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 border-2 border-dashed border-blue-300 rounded-xl p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Promociona Tu Negocio Aquí</h3>
                <p className="text-slate-600 mb-4">Llega a miles de compradores de vehículos. Crea tu anuncio y aumenta tu visibilidad.</p>
                <a
                  href="http://localhost:3004"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-bold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Crear Anuncio Ahora
                </a>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Dealers Destacados */}
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

      {/* Sección de Reseñas */}
      <ReviewsSection />

      {/* Banner Entre Contenido */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BetweenContentBanner />
      </div>

      {/* Sección de Patrocinadores */}
      <SponsoredContent />

      {/* Sección de Confianza y Garantías - ULTRA VISIBLE */}
      <section className="py-24 bg-gradient-to-b from-white to-slate-50 border-t-4 border-blue-600 relative overflow-hidden">
        {/* Background decorativo */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-600 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Header destacado */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full mb-6">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 00-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 00-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-bold text-sm uppercase tracking-wider">Garantía Total</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-extrabold text-slate-900 mb-6">
              ¿Por Qué <span className="text-blue-600">Elegirnos</span>?
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              La plataforma más confiable y segura para comprar tu vehículo. Cada transacción está respaldada por nuestras garantías.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-xl border-2 border-blue-100 hover:border-blue-500 transition-all hover:shadow-2xl hover:-translate-y-2">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3 text-center">Búsqueda Avanzada</h3>
              <p className="text-slate-600 text-center leading-relaxed">
                Filtros inteligentes y búsqueda por múltiples criterios para encontrar exactamente lo que buscas
              </p>
              <div className="mt-6 flex items-center justify-center gap-2">
                <span className="text-2xl font-bold text-blue-600">✓</span>
                <span className="text-sm font-semibold text-slate-700">Filtros Inteligentes</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-xl border-2 border-green-100 hover:border-green-500 transition-all hover:shadow-2xl hover:-translate-y-2">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3 text-center">Chat en Tiempo Real</h3>
              <p className="text-slate-600 text-center leading-relaxed">
                Comunicación directa con dealers y vendedores a través de WhatsApp y mensajería integrada
              </p>
              <div className="mt-6 flex items-center justify-center gap-2">
                <span className="text-2xl font-bold text-green-600">✓</span>
                <span className="text-sm font-semibold text-slate-700">Comunicación Directa</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-xl border-2 border-purple-100 hover:border-purple-500 transition-all hover:shadow-2xl hover:-translate-y-2">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3 text-center">Gestión de Leads</h3>
              <p className="text-slate-600 text-center leading-relaxed">
                Sistema CRM integrado para seguimiento profesional de tus consultas y solicitudes
              </p>
              <div className="mt-6 flex items-center justify-center gap-2">
                <span className="text-2xl font-bold text-purple-600">✓</span>
                <span className="text-sm font-semibold text-slate-700">CRM Integrado</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-xl border-2 border-amber-100 hover:border-amber-500 transition-all hover:shadow-2xl hover:-translate-y-2">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3 text-center">Reportes y Analytics</h3>
              <p className="text-slate-600 text-center leading-relaxed">
                Estadísticas detalladas de inventario, ventas y rendimiento para dealers y vendedores
              </p>
              <div className="mt-6 flex items-center justify-center gap-2">
                <span className="text-2xl font-bold text-amber-600">✓</span>
                <span className="text-sm font-semibold text-slate-700">Analytics Avanzado</span>
              </div>
            </div>
          </div>

          {/* Badges de confianza adicionales */}
          {(siteInfo.statisticsVisibility?.satisfiedCustomers || 
            siteInfo.statisticsVisibility?.averageRating || 
            siteInfo.statisticsVisibility?.satisfactionRate) && (
            <div className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white shadow-2xl">
              <div className="grid md:grid-cols-3 gap-6 text-center">
                {(siteInfo.statisticsVisibility?.satisfiedCustomers ?? true) && (
                  <div>
                    <div className="text-5xl font-bold mb-2">{siteInfo.statistics?.satisfiedCustomers || '10,000+'}</div>
                    <div className="text-white/90 font-medium text-lg">Clientes Satisfechos</div>
                  </div>
                )}
                {(siteInfo.statisticsVisibility?.averageRating ?? true) && (
                  <div className={(siteInfo.statisticsVisibility?.satisfiedCustomers ?? true) && (siteInfo.statisticsVisibility?.satisfactionRate ?? true) ? 'border-x border-white/20' : ''}>
                    <div className="text-5xl font-bold mb-2">{siteInfo.statistics?.averageRating || '4.9/5'}</div>
                    <div className="text-white/90 font-medium text-lg">Calificación Promedio</div>
                  </div>
                )}
                {(siteInfo.statisticsVisibility?.satisfactionRate ?? true) && (
                  <div>
                    <div className="text-5xl font-bold mb-2">{siteInfo.statistics?.satisfactionRate || '99.8%'}</div>
                    <div className="text-white/90 font-medium text-lg">Tasa de Satisfacción</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Contacto */}
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

      {/* Footer Moderno */}
      <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-xl">{siteInfo.logo}</span>
                </div>
                <span className="text-2xl font-bold">{siteInfo.name}</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                {siteInfo.description}
              </p>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-4">Navegación</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                {siteInfo.footerLinks.navigation.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className="hover:text-white transition">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-4">Contacto</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {siteInfo.contact.phone}
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {siteInfo.contact.email}
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {siteInfo.contact.address}
                </li>
                <li className="flex items-center gap-2 pt-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {siteInfo.contact.hours}
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-4">Legal</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                {siteInfo.footerLinks.legal.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="hover:text-white transition">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-400 text-sm mb-2">
              © {siteInfo.copyright.year} {siteInfo.copyright.company}. {siteInfo.copyright.text}
            </p>
            <p className="text-xs text-gray-500">
              {siteInfo.disclaimer}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
