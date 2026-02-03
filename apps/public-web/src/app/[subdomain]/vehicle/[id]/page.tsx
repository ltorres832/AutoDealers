'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import StarRating from '../../../../components/StarRating';
import ChatWidget from '../../../../components/ChatWidget';

interface Vehicle {
  id: string;
  tenantId: string;
  tenantName?: string;
  sellerId?: string | null;
  sellerRating?: number;
  sellerRatingCount?: number;
  make: string;
  model: string;
  year: number;
  price: number;
  currency: string;
  mileage?: number;
  condition: string;
  description: string;
  photos: string[];
  videos?: string[];
  createdAt?: string;
  updatedAt?: string;
  specifications?: {
    transmission?: string;
    fuelType?: string;
    engine?: string;
    color?: string;
    interiorColor?: string;
    doors?: number;
    seats?: number;
    vin?: string;
    stockNumber?: string;
    mpgCity?: number;
    mpgHighway?: number;
    drivetrain?: string;
    features?: string[];
    hasAccidents?: boolean;
    exteriorColor?: string;
    driveType?: string;
  };
}

// Función para convertir nombres de colores a códigos CSS
function getColorCode(colorName: string): string {
  if (!colorName) return '#808080'; // Gris por defecto
  
  const colorLower = colorName.toLowerCase().trim();
  
  // Mapeo de colores comunes
  const colorMap: Record<string, string> = {
    // Colores básicos
    'azul': '#0066CC',
    'blue': '#0066CC',
    'rojo': '#CC0000',
    'red': '#CC0000',
    'verde': '#00CC00',
    'green': '#00CC00',
    'amarillo': '#FFCC00',
    'yellow': '#FFCC00',
    'negro': '#000000',
    'black': '#000000',
    'blanco': '#FFFFFF',
    'white': '#FFFFFF',
    'gris': '#808080',
    'gray': '#808080',
    'grey': '#808080',
    'plateado': '#C0C0C0',
    'silver': '#C0C0C0',
    'dorado': '#FFD700',
    'gold': '#FFD700',
    'naranja': '#FF6600',
    'orange': '#FF6600',
    'morado': '#6600CC',
    'purple': '#6600CC',
    'rosa': '#FF66CC',
    'pink': '#FF66CC',
    'marrón': '#8B4513',
    'brown': '#8B4513',
    'beige': '#F5F5DC',
    'turquesa': '#40E0D0',
    'turquoise': '#40E0D0',
    'terracotta orange': '#E2725B',
    'terracotta': '#E2725B',
  };
  
  // Buscar coincidencia exacta
  if (colorMap[colorLower]) {
    return colorMap[colorLower];
  }
  
  // Buscar coincidencia parcial
  for (const [key, value] of Object.entries(colorMap)) {
    if (colorLower.includes(key) || key.includes(colorLower)) {
      return value;
    }
  }
  
  // Si es un código hexadecimal válido, devolverlo
  if (/^#[0-9A-Fa-f]{6}$/.test(colorName)) {
    return colorName;
  }
  
  // Si contiene palabras clave de color, intentar aproximar
  if (colorLower.includes('azul') || colorLower.includes('blue')) return '#0066CC';
  if (colorLower.includes('rojo') || colorLower.includes('red')) return '#CC0000';
  if (colorLower.includes('verde') || colorLower.includes('green')) return '#00CC00';
  if (colorLower.includes('negro') || colorLower.includes('black')) return '#000000';
  if (colorLower.includes('blanco') || colorLower.includes('white')) return '#FFFFFF';
  if (colorLower.includes('gris') || colorLower.includes('gray') || colorLower.includes('grey')) return '#808080';
  if (colorLower.includes('plateado') || colorLower.includes('silver')) return '#C0C0C0';
  
  // Color por defecto si no se encuentra
  return '#808080';
}

export default function VehicleDetailPage() {
  const params = useParams();
  // Aceptar tanto subdomain como tenantId (Next.js usa 'subdomain' como nombre del parámetro dinámico)
  const tenantId = (params.subdomain || params.tenantId) as string;
  const vehicleId = params.id as string;
  
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showFullSpecs, setShowFullSpecs] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (tenantId && vehicleId) {
      fetchVehicle();
    }
  }, [tenantId, vehicleId]);

  async function fetchVehicle() {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Buscando vehículo:', { vehicleId, tenantId });
      
      // Intentar obtener el vehículo directamente por ID
      let response = await fetch(`/api/public/vehicles/${vehicleId}?tenantId=${tenantId}`);
      let foundVehicle: Vehicle | null = null;
      let cleanedPhotos: string[] = [];
      
      // Si no existe endpoint directo, buscar en la lista
      if (!response.ok) {
        console.log('⚠️ Endpoint directo falló, buscando en lista...');
        response = await fetch('/api/public/vehicles?status=available');
        if (!response.ok) {
          throw new Error('Error al cargar vehículos');
        }
        
        const data = await response.json();
        console.log('📦 Datos recibidos de lista:', data);
        foundVehicle = data.vehicles?.find((v: Vehicle) => 
          v.id === vehicleId && v.tenantId === tenantId
        );
        
        if (!foundVehicle) {
          console.error('❌ Vehículo no encontrado en lista');
          setError('Vehículo no encontrado');
          return;
        }
      } else {
        const responseData = await response.json();
        console.log('📦 Respuesta del API:', responseData);
        // El API devuelve { vehicle: {...} }
        foundVehicle = responseData.vehicle || responseData;
        console.log('✅ Vehículo encontrado:', foundVehicle);
      }
      
      if (!foundVehicle) {
        console.error('❌ Vehículo es null');
        setError('Vehículo no encontrado');
        return;
      }
      
      console.log('📸 Fotos del vehículo:', foundVehicle.photos);
      console.log('💰 Precio del vehículo:', foundVehicle.price);
      console.log('📝 Descripción del vehículo:', foundVehicle.description);

      // Limpiar fotos - NO filtrar tan estrictamente
      const allPhotosRaw = foundVehicle.photos || [];
      console.log('📸 Fotos originales:', allPhotosRaw.length, allPhotosRaw);
      
      // Solo filtrar valores null/undefined y strings vacíos
      cleanedPhotos = allPhotosRaw
        .filter((photo: any) => {
          if (!photo) return false;
          if (typeof photo !== 'string') return false;
          const trimmed = photo.trim();
          return trimmed !== '' && trimmed !== 'undefined' && !trimmed.toLowerCase().includes('undefined');
        })
        .map((photo: string) => photo.trim());
      
      console.log('📸 Fotos después del filtro:', cleanedPhotos.length, cleanedPhotos);
      
      fetch(`/api/public/vehicles/${vehicleId}/view`, { method: 'POST' }).catch(console.error);
      
      const vehicleToSet = {
        ...foundVehicle,
        photos: cleanedPhotos,
      };
      
      console.log('💾 Estableciendo vehículo en estado:', {
        id: vehicleToSet.id,
        make: vehicleToSet.make,
        model: vehicleToSet.model,
        price: vehicleToSet.price,
        photos: vehicleToSet.photos.length,
        description: vehicleToSet.description?.substring(0, 50)
      });
      
      setVehicle(vehicleToSet);
    } catch (err: any) {
      console.error('Error fetching vehicle:', err);
      setError(err.message || 'Error al cargar el vehículo');
    } finally {
      setLoading(false);
    }
  }

  function nextPhoto() {
    if (vehicle && vehicle.photos && vehicle.photos.length > 0) {
      setCurrentPhotoIndex((prev) => (prev + 1) % vehicle.photos.length);
      setImageLoaded(false);
    }
  }

  function prevPhoto() {
    if (vehicle && vehicle.photos && vehicle.photos.length > 0) {
      setCurrentPhotoIndex((prev) => (prev - 1 + vehicle.photos.length) % vehicle.photos.length);
      setImageLoaded(false);
    }
  }
  
  // Resetear imagen cuando cambia el índice o el vehículo
  useEffect(() => {
    if (vehicle && vehicle.photos && vehicle.photos.length > 0) {
      setImageLoaded(false);
      setCurrentPhotoIndex(0);
    }
  }, [vehicle?.id]);
  
  useEffect(() => {
    if (vehicle && vehicle.photos && vehicle.photos.length > 0) {
      setImageLoaded(false);
    }
  }, [currentPhotoIndex]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-gray-600 text-lg font-medium">Cargando vehículo...</p>
        </div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-7xl mb-6 animate-bounce">🚗</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Vehículo no encontrado</h1>
          <p className="text-gray-600 mb-8 text-lg">{error || 'El vehículo que buscas no está disponible'}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-blue-700 font-semibold text-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al Inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header mejorado */}
      <nav className="bg-white/80 backdrop-blur-md shadow-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="flex gap-1 transform group-hover:scale-110 transition-transform">
                <div className="w-3 h-3 bg-teal-500 rounded-sm"></div>
                <div className="w-3 h-3 bg-purple-400 rounded-sm"></div>
                <div className="w-3 h-3 bg-orange-500 rounded-sm"></div>
                <div className="w-3 h-3 bg-purple-700 rounded-sm"></div>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                AUTODEALERS
              </span>
            </Link>
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition font-medium group"
            >
              <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al Inicio
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna izquierda - Galería (2/3 del ancho en desktop) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Galería principal mejorada */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
              {vehicle.photos && Array.isArray(vehicle.photos) && vehicle.photos.length > 0 && vehicle.photos[currentPhotoIndex] ? (
                <div className="relative group">
                  <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
                    <img
                      key={`photo-${currentPhotoIndex}-${vehicle.id}-${vehicle.photos[currentPhotoIndex]?.substring(0, 20)}`}
                      src={vehicle.photos[currentPhotoIndex].trim()}
                      alt={`${vehicle.year} ${vehicle.make} ${vehicle.model} - Foto ${currentPhotoIndex + 1}`}
                      className="w-full h-full object-cover"
                      loading="eager"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        // Intentar con URL codificada si aún no se ha intentado
                        if (!target.dataset.retried) {
                          try {
                            const originalUrl = vehicle.photos[currentPhotoIndex]?.trim();
                            if (originalUrl) {
                              const encodedUrl = encodeURI(originalUrl);
                              if (encodedUrl !== originalUrl) {
                                target.dataset.retried = 'true';
                                target.src = encodedUrl;
                                return;
                              }
                            }
                          } catch (err) {
                            // Continuar al placeholder
                          }
                        }
                        // Si ya se intentó o falló, mostrar placeholder
                        target.dataset.retried = 'true';
                        target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600"%3E%3Crect fill="%23ddd" width="800" height="600"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="60" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3E🚗%3C/text%3E%3C/svg%3E';
                      }}
                    />
                    {/* Overlay con información */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-4 left-4 right-4">
                        <p className="text-white text-sm font-medium">
                          Foto {currentPhotoIndex + 1} de {vehicle.photos.length}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {vehicle.photos.length > 1 && (
                    <>
                      {/* Botones de navegación mejorados */}
                      <button
                        onClick={prevPhoto}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/90 backdrop-blur-sm text-gray-900 p-3 rounded-full shadow-lg hover:bg-white transition-all hover:scale-110 opacity-0 group-hover:opacity-100"
                        aria-label="Foto anterior"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={nextPhoto}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/90 backdrop-blur-sm text-gray-900 p-3 rounded-full shadow-lg hover:bg-white transition-all hover:scale-110 opacity-0 group-hover:opacity-100"
                        aria-label="Foto siguiente"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      
                      {/* Indicadores de posición */}
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full">
                        {vehicle.photos.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setCurrentPhotoIndex(index);
                              setImageLoaded(false);
                            }}
                            className={`transition-all ${
                              index === currentPhotoIndex 
                                ? 'w-8 h-2 bg-white rounded-full' 
                                : 'w-2 h-2 bg-white/50 rounded-full hover:bg-white/75'
                            }`}
                            aria-label={`Ir a foto ${index + 1}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <div className="text-gray-400 text-8xl">🚗</div>
                </div>
              )}

              {/* Miniaturas mejoradas */}
              {vehicle.photos && vehicle.photos.length > 1 && (
                <div className="p-4 bg-gray-50 grid grid-cols-6 gap-3 border-t border-gray-100">
                  {vehicle.photos.map((photo, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setCurrentPhotoIndex(index);
                        setImageLoaded(false);
                      }}
                      className={`aspect-square rounded-lg overflow-hidden border-2 transition-all transform hover:scale-105 ${
                        index === currentPhotoIndex 
                          ? 'border-blue-600 ring-2 ring-blue-200 shadow-md' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={photo?.trim()}
                        alt={`Miniatura ${index + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          console.error('❌ Error cargando miniatura:', photo);
                          const target = e.target as HTMLImageElement;
                          if (!target.dataset.retried) {
                            try {
                              const trimmedUrl = photo?.trim();
                              if (trimmedUrl) {
                                const encodedUrl = encodeURI(trimmedUrl);
                                if (encodedUrl !== trimmedUrl) {
                                  target.dataset.retried = 'true';
                                  target.src = encodedUrl;
                                  return;
                                }
                              }
                            } catch (err) {
                              console.error('Error al codificar URL de miniatura:', err);
                            }
                          }
                          target.dataset.retried = 'true';
                          target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3E🚗%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Descripción mejorada */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Descripción
              </h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-lg">
                {vehicle.description || 'No hay descripción disponible para este vehículo.'}
              </p>
            </div>

            {/* Features & Specs mejorado */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Features & Specs
              </h2>
              
              {/* VIN y Stock # */}
              <div className="flex flex-wrap gap-6 mb-8 pb-6 border-b border-gray-200">
                {vehicle.specifications?.vin && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-600">VIN:</span>
                    <span className="font-mono text-sm font-bold text-gray-900 bg-gray-50 px-3 py-1 rounded-lg">
                      {vehicle.specifications.vin}
                    </span>
                  </div>
                )}
                {((vehicle as any).stockNumber || vehicle.specifications?.stockNumber) && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-600">Número de Control:</span>
                    <span className="font-semibold text-sm text-gray-900 bg-blue-50 text-blue-800 px-3 py-1 rounded-lg border border-blue-200">
                      #{(vehicle as any).stockNumber || vehicle.specifications?.stockNumber}
                    </span>
                  </div>
                )}
              </div>

              {/* Grid de características principales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {(vehicle.specifications?.exteriorColor || vehicle.specifications?.color) && (
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                    <div 
                      className="w-6 h-6 rounded-full shadow-md border border-gray-300"
                      style={{ 
                        backgroundColor: getColorCode(vehicle.specifications?.exteriorColor || vehicle.specifications?.color || '') 
                      }}
                    ></div>
                    <div>
                      <div className="text-xs text-gray-500 font-medium">Exterior</div>
                      <div className="text-gray-900 font-semibold">{vehicle.specifications?.exteriorColor || vehicle.specifications?.color}</div>
                    </div>
                  </div>
                )}
                {vehicle.specifications?.interiorColor && (
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                    <div 
                      className="w-6 h-6 rounded-full shadow-md border border-gray-300"
                      style={{ 
                        backgroundColor: getColorCode(vehicle.specifications.interiorColor) 
                      }}
                    ></div>
                    <div>
                      <div className="text-xs text-gray-500 font-medium">Interior</div>
                      <div className="text-gray-900 font-semibold">{vehicle.specifications.interiorColor}</div>
                    </div>
                  </div>
                )}
                {vehicle.specifications?.fuelType && (
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <div className="text-xs text-gray-500 font-medium">Combustible</div>
                      <div className="text-gray-900 font-semibold capitalize">{vehicle.specifications.fuelType}</div>
                    </div>
                  </div>
                )}
                {vehicle.specifications?.engine && (
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <div>
                      <div className="text-xs text-gray-500 font-medium">Motor</div>
                      <div className="text-gray-900 font-semibold">{vehicle.specifications.engine}</div>
                    </div>
                  </div>
                )}
                {(vehicle.specifications?.mpgCity || vehicle.specifications?.mpgHighway) && (
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <div>
                      <div className="text-xs text-gray-500 font-medium">Eficiencia</div>
                      <div className="text-gray-900 font-semibold">
                        {vehicle.specifications.mpgCity || 'N/A'} City / {vehicle.specifications.mpgHighway || 'N/A'} Hwy MPG
                      </div>
                    </div>
                  </div>
                )}
                {vehicle.specifications?.drivetrain && (
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <div>
                      <div className="text-xs text-gray-500 font-medium">Tracción</div>
                      <div className="text-gray-900 font-semibold">{vehicle.specifications.drivetrain}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Información de accidentes */}
              {vehicle.specifications?.hasAccidents === false && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                  <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <div className="font-semibold text-green-900">Sin accidentes reportados</div>
                    <div className="text-sm text-green-700">Este vehículo no tiene historial de accidentes o daños</div>
                  </div>
                </div>
              )}

              {/* Well-equipped Section mejorada */}
              {vehicle.specifications?.features && vehicle.specifications.features.length > 0 && (
                <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-6 mb-6 border border-blue-200">
                  <div className="flex items-center gap-3 mb-4">
                    <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    <h3 className="font-bold text-xl text-gray-900">Well-equipped</h3>
                  </div>
                  <p className="text-sm text-gray-700 mb-4 leading-relaxed">
                    Este vehículo está equipado con características adicionales comparado con otros {vehicle.make} {vehicle.model}s.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {vehicle.specifications.features.slice(0, 6).map((feature, index) => (
                      <span
                        key={index}
                        className="bg-white px-4 py-2 rounded-full text-sm font-medium text-gray-800 border border-blue-200 shadow-sm hover:shadow-md transition-shadow"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Botón para ver todas las especificaciones */}
              <button
                onClick={() => setShowFullSpecs(!showFullSpecs)}
                className="w-full bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-800 font-semibold py-4 px-6 rounded-xl transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 border border-gray-300"
              >
                <span>{showFullSpecs ? 'Ocultar' : 'Ver'} todas las especificaciones</span>
                <svg 
                  className={`w-5 h-5 transition-transform ${showFullSpecs ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Especificaciones completas expandibles */}
              {showFullSpecs && vehicle.specifications && (
                <div className="mt-6 pt-6 border-t border-gray-200 animate-fadeIn">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Especificaciones Completas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vehicle.specifications.transmission && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600 font-medium">Transmisión:</span>
                        <span className="ml-2 font-semibold text-gray-900 capitalize">{vehicle.specifications.transmission}</span>
                      </div>
                    )}
                    {vehicle.specifications.doors && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600 font-medium">Puertas:</span>
                        <span className="ml-2 font-semibold text-gray-900">{vehicle.specifications.doors}</span>
                      </div>
                    )}
                    {vehicle.specifications.seats && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600 font-medium">Asientos:</span>
                        <span className="ml-2 font-semibold text-gray-900">{vehicle.specifications.seats}</span>
                      </div>
                    )}
                    {vehicle.specifications.features && vehicle.specifications.features.length > 0 && (
                      <div className="md:col-span-2">
                        <span className="text-sm text-gray-600 font-medium block mb-2">Todas las características:</span>
                        <div className="flex flex-wrap gap-2">
                          {vehicle.specifications.features.map((feature, index) => (
                            <span
                              key={index}
                              className="bg-white px-3 py-1.5 rounded-lg text-sm text-gray-700 border border-gray-200 shadow-sm"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Videos */}
            {vehicle.videos && vehicle.videos.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Videos
                </h2>
                <div className="space-y-4">
                  {vehicle.videos.map((video, index) => (
                    <div key={index} className="aspect-video bg-gray-900 rounded-xl overflow-hidden shadow-lg">
                      <video
                        src={video}
                        controls
                        className="w-full h-full"
                      >
                        Tu navegador no soporta videos.
                      </video>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Columna derecha - Información y acciones (1/3 del ancho en desktop) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Card principal de información */}
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                <div className="flex items-start justify-between mb-2">
                  <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </h1>
                  {((vehicle as any).stockNumber || vehicle.specifications?.stockNumber) && (
                    <span className="text-sm font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-lg border border-blue-200 whitespace-nowrap ml-4">
                      #{(vehicle as any).stockNumber || vehicle.specifications?.stockNumber}
                    </span>
                  )}
                </div>
                
                {((vehicle as any).stockNumber || vehicle.specifications?.stockNumber) && (
                  <p className="text-xs text-gray-500 mb-3">
                    Número de Control: <span className="font-semibold text-gray-700">#{(vehicle as any).stockNumber || vehicle.specifications?.stockNumber}</span>
                  </p>
                )}
                
                {/* Tiempo listado */}
                {vehicle.createdAt && (() => {
                  const createdDate = new Date(vehicle.createdAt);
                  const now = new Date();
                  const diffTime = Math.abs(now.getTime() - createdDate.getTime());
                  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                  const diffMonths = Math.floor(diffDays / 30);
                  const diffYears = Math.floor(diffDays / 365);
                  
                  let timeText = '';
                  if (diffYears > 0) {
                    timeText = `${diffYears} ${diffYears === 1 ? 'año' : 'años'}`;
                  } else if (diffMonths > 0) {
                    timeText = `${diffMonths} ${diffMonths === 1 ? 'mes' : 'meses'}`;
                  } else if (diffDays > 0) {
                    timeText = `${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
                  } else {
                    timeText = 'Hoy';
                  }
                  
                  return (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <div className="text-xs text-blue-600 font-medium">Tiempo en la plataforma</div>
                          <div className="text-sm font-semibold text-blue-900">{timeText}</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                
                <div className="mb-6">
                  <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600 mb-1">
                    {vehicle.currency || '$'} {(vehicle.price || 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">Precio final</p>
                </div>

                {/* Información del vendedor */}
                {vehicle.tenantName && vehicle.sellerId && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                    <Link
                      href={`/seller/${vehicle.sellerId}`}
                      className="group flex items-center gap-3 mb-3"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md group-hover:shadow-lg transition-shadow">
                        {vehicle.tenantName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {vehicle.tenantName}
                        </div>
                        <div className="text-sm text-gray-600">Ver perfil completo</div>
                      </div>
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                    {vehicle.sellerRating !== undefined && vehicle.sellerRating > 0 && (
                      <div className="flex items-center gap-2">
                        <StarRating
                          rating={vehicle.sellerRating}
                          count={vehicle.sellerRatingCount || 0}
                          size="md"
                          showCount={true}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Grid de información rápida */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {vehicle.mileage && (
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                      <div className="text-xs text-gray-600 font-medium mb-1">Kilometraje</div>
                      <div className="text-lg font-bold text-gray-900">{vehicle.mileage.toLocaleString()} km</div>
                    </div>
                  )}
                  {vehicle.condition && (
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                      <div className="text-xs text-gray-600 font-medium mb-1">Condición</div>
                      <div className="text-lg font-bold text-gray-900 capitalize">{vehicle.condition}</div>
                    </div>
                  )}
                  {vehicle.specifications?.transmission && (
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                      <div className="text-xs text-gray-600 font-medium mb-1">Transmisión</div>
                      <div className="text-lg font-bold text-gray-900 capitalize">{vehicle.specifications.transmission}</div>
                    </div>
                  )}
                  {vehicle.specifications?.fuelType && (
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                      <div className="text-xs text-gray-600 font-medium mb-1">Combustible</div>
                      <div className="text-lg font-bold text-gray-900 capitalize">{vehicle.specifications.fuelType}</div>
                    </div>
                  )}
                </div>

                    {/* Botones de acción mejorados */}
                    <div className="space-y-3">
                      {/* Botones de acciones rápidas */}
                      <div className="flex gap-2 mb-4">
                        <button
                          onClick={() => {
                            if (navigator.share) {
                              navigator.share({
                                title: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
                                text: `Mira este vehículo: ${vehicle.year} ${vehicle.make} ${vehicle.model} - ${vehicle.currency || '$'} ${(vehicle.price || 0).toLocaleString()}`,
                                url: window.location.href,
                              }).catch(() => {});
                            } else {
                              navigator.clipboard.writeText(window.location.href);
                              alert('Enlace copiado al portapapeles');
                            }
                          }}
                          className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 font-medium text-sm flex items-center justify-center gap-2 transition-all"
                          title="Compartir"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                          Compartir
                        </button>
                        <button
                          onClick={() => window.print()}
                          className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 font-medium text-sm flex items-center justify-center gap-2 transition-all"
                          title="Imprimir"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                          Imprimir
                        </button>
                        <button
                          onClick={() => {
                            const subject = encodeURIComponent(`Consulta sobre ${vehicle.year} ${vehicle.make} ${vehicle.model}`);
                            const body = encodeURIComponent(`Hola,\n\nEstoy interesado en el siguiente vehículo:\n\n${vehicle.year} ${vehicle.make} ${vehicle.model}\nPrecio: ${vehicle.currency || '$'} ${(vehicle.price || 0).toLocaleString()}\n\n${window.location.href}`);
                            window.location.href = `mailto:?subject=${subject}&body=${body}`;
                          }}
                          className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 font-medium text-sm flex items-center justify-center gap-2 transition-all"
                          title="Enviar por Email"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Email
                        </button>
                      </div>

                      {vehicle.tenantId && vehicle.tenantName && (
                        <button
                          onClick={() => {
                            // Disparar evento para abrir el chat
                            window.dispatchEvent(new CustomEvent('openChat'));
                          }}
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 rounded-xl hover:from-purple-700 hover:to-pink-700 font-semibold text-lg text-center block shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          Chatear con {vehicle.tenantName}
                        </button>
                      )}
                  <a
                    href={`https://wa.me/?text=Hola, estoy interesado en el vehículo: ${vehicle.year} ${vehicle.make} ${vehicle.model} - ${vehicle.currency || '$'} ${(vehicle.price || 0).toLocaleString()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4 rounded-xl hover:from-green-600 hover:to-emerald-700 font-semibold text-lg text-center block shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    Contactar por WhatsApp
                  </a>
                  <a
                    href={`tel:+1234567890`}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold text-lg text-center block shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Llamar Ahora
                  </a>
                  {vehicle.sellerId && (
                    <Link
                      href={`/seller/${vehicle.sellerId}`}
                      className="w-full bg-gradient-to-r from-gray-700 to-gray-800 text-white px-6 py-4 rounded-xl hover:from-gray-800 hover:to-gray-900 font-semibold text-lg text-center block shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Ver Perfil del Vendedor
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>

      {/* Chat Widget */}
      {vehicle.tenantId && vehicle.tenantName && (
        <ChatWidget tenantId={vehicle.tenantId} tenantName={vehicle.tenantName} />
      )}
    </div>
  );
}
