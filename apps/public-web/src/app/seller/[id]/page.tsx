'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import StarRating from '../../../components/StarRating';
import ChatWidget from '../../../components/ChatWidget';

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
  specifications?: {
    transmission?: string;
    fuelType?: string;
  };
}

export default function SellerPublicPage() {
  const params = useParams();
  const sellerId = params.id as string;
  const [seller, setSeller] = useState<Seller | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

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
        
        setSeller(data.seller);
        setVehicles(data.vehicles || []);
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Vendedor no encontrado</h1>
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
          <Link href="/" className="text-purple-600 hover:underline">
            ← Volver al inicio
          </Link>
        </div>
      </nav>

      {/* Perfil del Vendedor */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Foto */}
            <div className="w-32 h-32 rounded-full bg-purple-100 flex items-center justify-center overflow-hidden">
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
                      fallback.className = 'text-4xl text-purple-600';
                      fallback.textContent = seller.name.charAt(0).toUpperCase();
                      parent.appendChild(fallback);
                    }
                  }}
                />
              ) : (
                <span className="text-4xl text-purple-600">
                  {seller.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Información */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold mb-2">{seller.name}</h1>
              <p className="text-lg text-gray-600 mb-4">{seller.title || 'Vendedor'}</p>

              {/* Información de contacto */}
              <div className="space-y-3 text-sm">
                {/* Email - Siempre visible */}
                <div className="flex items-center gap-2 text-gray-700">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {seller.email ? (
                    <a href={`mailto:${seller.email}`} className="text-blue-600 hover:text-blue-800 hover:underline">
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
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  {seller.website ? (
                    <a 
                      href={seller.website.startsWith('http') ? seller.website : `https://${seller.website}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {seller.website.replace(/^https?:\/\//, '')}
                    </a>
                  ) : (
                    <span className="text-gray-400">No disponible</span>
                  )}
                </div>
              </div>
              
              {/* Calificación - Siempre visible */}
              <div className="mt-4">
                {seller.sellerRating > 0 ? (
                  <StarRating
                    rating={seller.sellerRating}
                    count={seller.sellerRatingCount}
                    size="lg"
                    showCount={true}
                  />
                ) : (
                  <div className="flex items-center gap-2 text-gray-500">
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
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 font-medium flex items-center justify-center gap-2 transition-all transform hover:scale-105"
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

        {/* Vehículos Publicados */}
        <div>
          <h2 className="text-2xl font-bold mb-6">
            Vehículos Disponibles ({vehicles.length})
          </h2>

          {vehicles.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-600">Este vendedor no tiene vehículos publicados aún.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden"
                >
                  {vehicle.photos && vehicle.photos.length > 0 && vehicle.photos[0] ? (
                    <div className="relative h-48 bg-gray-200">
                      <img
                        src={vehicle.photos[0]}
                        alt={`${vehicle.make} ${vehicle.model}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Si la imagen falla, mostrar placeholder
                          const target = e.target as HTMLImageElement;
                          target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3E🚗%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="relative h-48 bg-gray-200 flex items-center justify-center">
                      <span className="text-6xl">🚗</span>
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
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {vehicle.description}
                    </p>
                    <div className="flex gap-2">
                      <a
                        href={(seller.whatsapp || seller.phone) ? `https://wa.me/${(seller.whatsapp || seller.phone || '').replace(/[^0-9]/g, '')}?text=Hola, estoy interesado en el vehículo: ${vehicle.year} ${vehicle.make} ${vehicle.model} - ${vehicle.currency} ${vehicle.price.toLocaleString()}` : '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          if (!seller.whatsapp && !seller.phone) {
                            e.preventDefault();
                            alert('Número de WhatsApp no disponible');
                          }
                        }}
                        className={`flex-1 px-4 py-2 rounded font-medium text-sm text-center flex items-center justify-center gap-1 ${
                          (seller.whatsapp || seller.phone)
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-gray-400 text-white cursor-not-allowed opacity-50'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                        </svg>
                        WhatsApp
                      </a>
                      <button
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('openChat', { detail: { vehicleId: vehicle.id } }));
                        }}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded hover:from-purple-700 hover:to-pink-700 font-medium text-sm flex items-center justify-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Chat
                      </button>
                      {seller.email && (
                        <button
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
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Widget */}
      {seller.tenantId && seller.name && (
        <ChatWidget tenantId={seller.tenantId} tenantName={seller.name} />
      )}
    </div>
  );
}

