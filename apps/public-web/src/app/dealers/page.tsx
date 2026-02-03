'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import StarRating from '../../components/StarRating';

interface Seller {
  id: string;
  name: string;
  title: string;
  photo: string;
  sellerRating: number;
  sellerRatingCount: number;
  tenantName: string;
  publishedVehiclesCount: number;
}

interface Dealer {
  id: string;
  name: string;
  companyName: string;
  tenantName: string;
  dealerRating: number;
  dealerRatingCount: number;
  publishedVehiclesCount: number;
  sellersCount: number;
  photo?: string;
  location?: string;
}

export default function DealersPage() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'dealers' | 'sellers'>('all');
  const [sortBy, setSortBy] = useState<'rating' | 'vehicles' | 'name'>('rating');
  const [searchQuery, setSearchQuery] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(12); // Mostrar 12 inicialmente

  useEffect(() => {
    fetchAllDealersAndSellers();
  }, []);

  async function fetchAllDealersAndSellers() {
    try {
      setLoading(true);
      console.log('🔍 Fetching all dealers and sellers...');
      // Buscar todos los dealers y sellers (usando * como query para obtener todos)
      // Aumentar límite para tener todos los datos disponibles para búsqueda/filtrado
      const response = await fetch('/api/public/search?q=*&type=all&limit=500');
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Search API response:', {
          dealersCount: data.results?.dealers?.length || data.dealers?.length || 0,
          sellersCount: data.results?.sellers?.length || data.sellers?.length || 0,
          total: data.total,
        });
        
        const sellersData = data.results?.sellers || data.sellers || [];
        const dealersData = data.results?.dealers || data.dealers || [];
        
        console.log(`📊 Setting ${dealersData.length} dealers and ${sellersData.length} sellers`);
        setSellers(sellersData);
        setDealers(dealersData);
      } else {
        const errorData = await response.json();
        console.error('❌ Search API error:', errorData);
      }
    } catch (error) {
      console.error('❌ Error fetching dealers and sellers:', error);
    } finally {
      setLoading(false);
    }
  }

  // Filtrar por búsqueda y ordenar
  const filteredDealers = [...dealers]
    .filter((dealer) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const name = (dealer.companyName || dealer.name || '').toLowerCase();
      const location = (dealer.location || '').toLowerCase();
      return name.includes(query) || location.includes(query);
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return (b.dealerRating || 0) - (a.dealerRating || 0);
        case 'vehicles':
          return (b.publishedVehiclesCount || 0) - (a.publishedVehiclesCount || 0);
        case 'name':
          return (a.companyName || a.name).localeCompare(b.companyName || b.name);
        default:
          return 0;
      }
    });

  const filteredSellers = [...sellers]
    .filter((seller) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const name = (seller.name || '').toLowerCase();
      const title = (seller.title || '').toLowerCase();
      const tenantName = (seller.tenantName || '').toLowerCase();
      return name.includes(query) || title.includes(query) || tenantName.includes(query);
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return (b.sellerRating || 0) - (a.sellerRating || 0);
        case 'vehicles':
          return (b.publishedVehiclesCount || 0) - (a.publishedVehiclesCount || 0);
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

  // Paginación
  const displayedDealers = filteredDealers.slice(0, itemsPerPage);
  const displayedSellers = filteredSellers.slice(0, itemsPerPage);
  const hasMoreDealers = filteredDealers.length > itemsPerPage;
  const hasMoreSellers = filteredSellers.length > itemsPerPage;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href="/" className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al inicio
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Título */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Dealers y Vendedores Disponibles
          </h1>
          <p className="text-xl text-gray-600">
            Conoce a todos nuestros dealers y vendedores profesionales
          </p>
        </div>

        {/* Tabs y Filtros */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          {/* Búsqueda */}
          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por nombre, ubicación..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setItemsPerPage(12); // Resetear paginación al buscar
                }}
                className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setItemsPerPage(12);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200 w-full md:w-auto">
              <button
                onClick={() => {
                  setActiveTab('all');
                  setItemsPerPage(12);
                }}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'all'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Todos ({filteredDealers.length + filteredSellers.length})
              </button>
              <button
                onClick={() => {
                  setActiveTab('dealers');
                  setItemsPerPage(12);
                }}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'dealers'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Dealers ({filteredDealers.length})
              </button>
              <button
                onClick={() => {
                  setActiveTab('sellers');
                  setItemsPerPage(12);
                }}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'sellers'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Vendedores ({filteredSellers.length})
              </button>
            </div>

            {/* Ordenar */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Ordenar por:</label>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as any);
                  setItemsPerPage(12);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="rating">Mejor Calificación</option>
                <option value="vehicles">Más Vehículos</option>
                <option value="name">Nombre A-Z</option>
              </select>
            </div>
          </div>
        </div>

        {/* Resultados */}
        <div className="space-y-8">
          {/* Dealers */}
          {(activeTab === 'all' || activeTab === 'dealers') && filteredDealers.length > 0 && (
            <div>
              <h2 className="text-3xl font-bold mb-6 text-gray-900">
                Concesionarios ({filteredDealers.length})
                {displayedDealers.length < filteredDealers.length && (
                  <span className="text-lg font-normal text-gray-500 ml-2">
                    (Mostrando {displayedDealers.length} de {filteredDealers.length})
                  </span>
                )}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedDealers.map((dealer) => (
                  <Link
                    key={dealer.id}
                    href={`/dealer/${dealer.id}`}
                    className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all overflow-hidden border-2 border-transparent hover:border-blue-500 group"
                  >
                    <div className="p-6">
                      {/* Foto y Nombre */}
                      <div className="flex items-center gap-4 mb-4">
                        {dealer.photo ? (
                          <img
                            src={dealer.photo}
                            alt={dealer.companyName || dealer.name}
                            className="w-16 h-16 rounded-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                const fallback = document.createElement('div');
                                fallback.className = 'w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold';
                                fallback.textContent = (dealer.companyName || dealer.name).charAt(0).toUpperCase();
                                parent.appendChild(fallback);
                              }
                            }}
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold">
                            {(dealer.companyName || dealer.name).charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition truncate">
                            {dealer.companyName || dealer.name}
                          </h3>
                          {dealer.companyName && dealer.name !== dealer.companyName && (
                            <p className="text-sm text-gray-600 truncate">{dealer.name}</p>
                          )}
                          {dealer.location && (
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {dealer.location}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Rating */}
                      {dealer.dealerRating > 0 ? (
                        <div className="flex items-center gap-2 mb-4">
                          <StarRating
                            rating={dealer.dealerRating}
                            count={dealer.dealerRatingCount}
                            size="sm"
                            showCount={true}
                          />
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 mb-4">Sin calificaciones aún</p>
                      )}

                      {/* Estadísticas */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{dealer.publishedVehiclesCount || 0} vehículos disponibles</span>
                        </div>
                        {dealer.sellersCount > 0 && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span>{dealer.sellersCount} vendedor{dealer.sellersCount !== 1 ? 'es' : ''}</span>
                          </div>
                        )}
                      </div>

                      {/* Botón */}
                      <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium transition-colors">
                        Ver Perfil Completo
                      </button>
                    </div>
                  </Link>
                ))}
              </div>
              
              {/* Botón Cargar Más */}
              {hasMoreDealers && (
                <div className="mt-8 text-center">
                  <button
                    onClick={() => setItemsPerPage(itemsPerPage + 12)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                  >
                    Cargar Más Dealers ({filteredDealers.length - displayedDealers.length} restantes)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Vendedores */}
          {(activeTab === 'all' || activeTab === 'sellers') && filteredSellers.length > 0 && (
            <div>
              <h2 className="text-3xl font-bold mb-6 text-gray-900">
                Vendedores ({filteredSellers.length})
                {displayedSellers.length < filteredSellers.length && (
                  <span className="text-lg font-normal text-gray-500 ml-2">
                    (Mostrando {displayedSellers.length} de {filteredSellers.length})
                  </span>
                )}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedSellers.map((seller) => (
                  <Link
                    key={seller.id}
                    href={`/seller/${seller.id}`}
                    className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all overflow-hidden border-2 border-transparent hover:border-purple-500 group"
                  >
                    <div className="p-6">
                      {/* Foto y Nombre */}
                      <div className="flex items-center gap-4 mb-4">
                        {seller.photo ? (
                          <img
                            src={seller.photo}
                            alt={seller.name}
                            className="w-16 h-16 rounded-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                const fallback = document.createElement('div');
                                fallback.className = 'w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-xl font-bold';
                                fallback.textContent = seller.name.charAt(0).toUpperCase();
                                parent.appendChild(fallback);
                              }
                            }}
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-xl font-bold">
                            {seller.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-gray-900 group-hover:text-purple-600 transition truncate">
                            {seller.name}
                          </h3>
                          <p className="text-sm text-gray-600 truncate">{seller.title || 'Vendedor'}</p>
                          {seller.tenantName && (
                            <p className="text-xs text-gray-500 mt-1 truncate">{seller.tenantName}</p>
                          )}
                        </div>
                      </div>

                      {/* Rating */}
                      {seller.sellerRating > 0 ? (
                        <div className="flex items-center gap-2 mb-4">
                          <StarRating
                            rating={seller.sellerRating}
                            count={seller.sellerRatingCount}
                            size="sm"
                            showCount={true}
                          />
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 mb-4">Sin calificaciones aún</p>
                      )}

                      {/* Vehículos */}
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{seller.publishedVehiclesCount || 0} vehículo{seller.publishedVehiclesCount !== 1 ? 's' : ''} disponible{seller.publishedVehiclesCount !== 1 ? 's' : ''}</span>
                      </div>

                      {/* Botón */}
                      <button className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 font-medium transition-colors">
                        Ver Perfil Completo
                      </button>
                    </div>
                  </Link>
                ))}
              </div>
              
              {/* Botón Cargar Más */}
              {hasMoreSellers && (
                <div className="mt-8 text-center">
                  <button
                    onClick={() => setItemsPerPage(itemsPerPage + 12)}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors"
                  >
                    Cargar Más Vendedores ({filteredSellers.length - displayedSellers.length} restantes)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Sin resultados */}
          {((activeTab === 'dealers' && filteredDealers.length === 0) ||
            (activeTab === 'sellers' && filteredSellers.length === 0) ||
            (activeTab === 'all' && filteredDealers.length === 0 && filteredSellers.length === 0)) && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                No hay {activeTab === 'dealers' ? 'dealers' : activeTab === 'sellers' ? 'vendedores' : 'resultados'} disponibles
              </h3>
              <p className="text-gray-600">
                {activeTab === 'dealers'
                  ? 'No hay concesionarios registrados en este momento.'
                  : activeTab === 'sellers'
                  ? 'No hay vendedores registrados en este momento.'
                  : 'No hay dealers ni vendedores disponibles en este momento.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

