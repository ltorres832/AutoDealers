'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import StarRating from '../../../components/StarRating';

interface Dealer {
  id: string;
  name: string;
  companyName: string;
  tenantId: string;
  tenantName: string;
  dealerRating: number;
  dealerRatingCount: number;
  email?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
}

interface Seller {
  id: string;
  name: string;
  title: string;
  photo: string;
  sellerRating: number;
  sellerRatingCount: number;
  email?: string;
  phone?: string;
  whatsapp?: string;
  vehiclesCount?: number;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  currency: string;
  photos: string[];
  mileage?: number;
  condition: string;
  description: string;
}

export default function DealerPublicPage() {
  const params = useParams();
  const dealerId = params.id as string;
  const [dealer, setDealer] = useState<Dealer | null>(null);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (dealerId) {
      fetchDealerData();
    }
  }, [dealerId]);

  async function fetchDealerData() {
    try {
      setLoading(true);
      console.log(`🔍 Fetching dealer data for ID: ${dealerId}`);
      const response = await fetch(`/api/public/dealer/${dealerId}`);
      console.log(`📡 Response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Dealer data received:`, {
          dealer: data.dealer?.name,
          vehiclesCount: data.vehicles?.length || 0,
          sellersCount: data.sellers?.length || 0,
          sellers: data.sellers?.map((s: any) => ({
            name: s.name,
            id: s.id,
            vehiclesCount: s.vehiclesCount,
          })),
        });
        setDealer(data.dealer);
        setSellers(data.sellers || []);
        setVehicles(data.vehicles || []);
      } else {
        const errorData = await response.json();
        console.error('❌ Error fetching dealer data:', errorData);
      }
    } catch (error) {
      console.error('❌ Error fetching dealer data:', error);
    } finally {
      setLoading(false);
    }
  }


  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!dealer) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Dealer no encontrado</h1>
          <Link href="/" className="text-purple-600 hover:underline">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="text-gray-600 hover:text-gray-900 hover:underline flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Atrás
          </button>
          <span className="text-gray-300">|</span>
          <Link href="/dealers" className="text-blue-600 hover:underline">
            ← Volver a Dealers
          </Link>
          <span className="text-gray-300">|</span>
          <Link href="/" className="text-purple-600 hover:underline">
            ← Volver al inicio
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Perfil del Dealer */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2">{dealer.companyName || dealer.name}</h1>
            {dealer.companyName && dealer.name !== dealer.companyName && (
              <p className="text-xl text-gray-600 mb-4">{dealer.name}</p>
            )}
            
            {/* Información de contacto */}
            <div className="space-y-3 mb-6 text-sm">
              {/* Email - Siempre visible */}
              <div className="flex items-center justify-center gap-2 text-gray-700">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {dealer.email ? (
                  <a href={`mailto:${dealer.email}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                    {dealer.email}
                  </a>
                ) : (
                  <span className="text-gray-400">No disponible</span>
                )}
              </div>
              
              {/* WhatsApp - Usar whatsapp o phone como fallback */}
              {(dealer.whatsapp || dealer.phone) && (
                <div className="flex items-center justify-center gap-2 text-gray-700">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  <a 
                    href={`https://wa.me/${(dealer.whatsapp || dealer.phone || '').replace(/[^0-9]/g, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-800 hover:underline"
                  >
                    {dealer.whatsapp || dealer.phone}
                  </a>
                </div>
              )}
              
              {/* Website - Siempre visible */}
              <div className="flex items-center justify-center gap-2 text-gray-700">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                {dealer.website ? (
                  <a 
                    href={dealer.website.startsWith('http') ? dealer.website : `https://${dealer.website}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {dealer.website.replace(/^https?:\/\//, '')}
                  </a>
                ) : (
                  <span className="text-gray-400">No disponible</span>
                )}
              </div>
            </div>
            
            {/* Calificación - Siempre visible */}
            <div className="mb-6">
              {dealer.dealerRating > 0 ? (
                <StarRating
                  rating={dealer.dealerRating}
                  count={dealer.dealerRatingCount}
                  size="lg"
                  showCount={true}
                />
              ) : (
                <div className="flex items-center justify-center gap-2 text-gray-500">
                  <span className="text-sm">Sin calificaciones aún</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-center flex-wrap">
              {dealer.email && (
                <button
                  onClick={() => {
                    window.location.href = `mailto:${dealer.email}?subject=Consulta sobre vehículos`;
                  }}
                  className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-medium flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Contactar por Email
                </button>
              )}
              {dealer.whatsapp && (
                <a
                  href={`https://wa.me/${dealer.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-medium flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  WhatsApp
                </a>
              )}
              {dealer.phone && (
                <a
                  href={`tel:${dealer.phone}`}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Llamar
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Vendedores del Dealer */}
        {sellers.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-3xl font-bold mb-6 text-gray-900">Nuestros Vendedores ({sellers.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sellers.map((seller) => {
                // Usar vehiclesCount del seller que viene del backend (ya está calculado correctamente)
                const sellerVehiclesCount = seller.vehiclesCount || 0;
                
                // Log para debugging
                if (seller.name === 'Luis') {
                  console.log(`🔍 Seller Luis:`, {
                    id: seller.id,
                    name: seller.name,
                    vehiclesCount: seller.vehiclesCount,
                    vehiclesCountFromBackend: seller.vehiclesCount,
                  });
                }
                
                return (
                  <Link
                    key={seller.id}
                    href={`/seller/${seller.id}`}
                    className="border-2 rounded-xl p-6 hover:shadow-xl transition-all border-gray-200 hover:border-purple-500 bg-white group cursor-pointer"
                  >
                    <div className="text-center">
                      {/* Foto del vendedor */}
                      <div className="w-28 h-28 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center overflow-hidden mx-auto mb-4 border-4 border-white shadow-lg group-hover:scale-105 transition-transform">
                        {seller.photo ? (
                          <img
                            src={seller.photo}
                            alt={seller.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = `<span class="text-4xl text-white font-bold">${seller.name.charAt(0).toUpperCase()}</span>`;
                              }
                            }}
                          />
                        ) : (
                          <span className="text-4xl text-white font-bold">
                            {seller.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      
                      {/* Nombre y título */}
                      <h3 className="font-bold text-xl text-gray-900 mb-1 group-hover:text-purple-600 transition">{seller.name}</h3>
                      <p className="text-sm text-gray-600 mb-3">{seller.title || 'Vendedor'}</p>
                      
                      {/* Rating - Siempre visible */}
                      <div className="mb-4">
                        {seller.sellerRating > 0 ? (
                          <div className="flex flex-col items-center gap-2">
                            <StarRating
                              rating={seller.sellerRating}
                              count={seller.sellerRatingCount}
                              size="md"
                              showCount={true}
                            />
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              <span className="font-semibold">{seller.sellerRating.toFixed(1)}</span>
                              <span className="text-gray-500">({seller.sellerRatingCount} {seller.sellerRatingCount === 1 ? 'reseña' : 'reseñas'})</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.364 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.364-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                            <span>Sin calificaciones aún</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Estadísticas del vendedor */}
                      <div className="space-y-3 pt-4 border-t border-gray-200 mb-4">
                        {/* Vehículos disponibles */}
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-medium">{sellerVehiclesCount} vehículo{sellerVehiclesCount !== 1 ? 's' : ''}</span>
                        </div>
                        
                        {/* Información de contacto visible */}
                        <div className="flex flex-wrap justify-center gap-3 text-xs">
                          {seller.email && (
                            <div className="flex items-center gap-1 text-blue-600">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <span className="truncate max-w-[120px]">{seller.email}</span>
                            </div>
                          )}
                          {(seller.phone || seller.whatsapp) && (
                            <div className="flex items-center gap-1 text-green-600">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                              </svg>
                              <span>{seller.whatsapp || seller.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Botón para ver perfil */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2.5 rounded-lg font-medium text-sm group-hover:from-purple-700 group-hover:to-pink-700 transition-all flex items-center justify-center gap-2">
                          <span>Ver Perfil Completo</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Vehículos del Dealer */}
        <div>
          <h2 className="text-2xl font-bold mb-6">
            Vehículos Disponibles ({vehicles.length})
          </h2>

          {vehicles.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-600">Este dealer no tiene vehículos publicados aún.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden"
                >
                  {vehicle.photos && vehicle.photos.length > 0 && (
                    <div className="relative h-48 bg-gray-200">
                      <img
                        src={vehicle.photos[0]}
                        alt={`${vehicle.make} ${vehicle.model}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-2">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </h3>
                    <p className="text-2xl font-bold text-purple-600 mb-2">
                      {vehicle.currency} {vehicle.price.toLocaleString()}
                    </p>
                    {vehicle.mileage && (
                      <p className="text-sm text-gray-600 mb-2">
                        {vehicle.mileage.toLocaleString()} km
                      </p>
                    )}
                    <div className="flex gap-2">
                      {dealer.email && (
                        <button
                          onClick={() => {
                            window.location.href = `mailto:${dealer.email}?subject=Consulta sobre ${vehicle.year} ${vehicle.make} ${vehicle.model}`;
                          }}
                          className="flex-1 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 font-medium text-sm flex items-center justify-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Email
                        </button>
                      )}
                      {dealer.phone && (
                        <a
                          href={`tel:${dealer.phone}`}
                          className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-medium text-sm text-center flex items-center justify-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          Llamar
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

