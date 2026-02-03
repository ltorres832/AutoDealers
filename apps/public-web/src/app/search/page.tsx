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
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState<'all' | 'seller' | 'dealer'>('all');

  useEffect(() => {
    if (query.length >= 2) {
      const timeoutId = setTimeout(() => {
        performSearch();
      }, 300);

      return () => clearTimeout(timeoutId);
    } else {
      setSellers([]);
      setDealers([]);
    }
  }, [query, searchType]);

  async function performSearch() {
    if (query.length < 2) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/public/search?q=${encodeURIComponent(query)}&type=${searchType}`
      );
      if (response.ok) {
        const data = await response.json();
        setSellers(data.sellers || []);
        setDealers(data.dealers || []);
      }
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href="/" className="text-purple-600 hover:underline">
            ← Volver al inicio
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Buscar Vendedor o Dealer</h1>
          <p className="text-gray-600">
            Encuentra vendedores y dealers por nombre
          </p>
        </div>

        {/* Buscador */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as any)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">Todos</option>
              <option value="seller">Vendedores</option>
              <option value="dealer">Dealers</option>
            </select>
          </div>

          {loading && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            </div>
          )}
        </div>

        {/* Resultados */}
        {query.length >= 2 && !loading && (
          <div className="space-y-8">
            {/* Vendedores */}
            {sellers.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">
                  Vendedores ({sellers.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sellers.map((seller) => (
                    <Link
                      key={seller.id}
                      href={`/seller/${seller.id}`}
                      className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {seller.photo ? (
                            <img
                              src={seller.photo}
                              alt={seller.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-2xl text-purple-600">
                              {seller.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg">{seller.name}</h3>
                          <p className="text-sm text-gray-600">{seller.title}</p>
                        </div>
                      </div>
                      {seller.sellerRating > 0 && (
                        <div className="mb-2">
                          <StarRating
                            rating={seller.sellerRating}
                            count={seller.sellerRatingCount}
                            size="sm"
                            showCount={true}
                          />
                        </div>
                      )}
                      <p className="text-sm text-gray-600">
                        {seller.publishedVehiclesCount} vehículo{seller.publishedVehiclesCount !== 1 ? 's' : ''} disponible{seller.publishedVehiclesCount !== 1 ? 's' : ''}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Dealers */}
            {dealers.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">
                  Dealers ({dealers.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {dealers.map((dealer) => (
                    <Link
                      key={dealer.id}
                      href={`/dealer/${dealer.id}`}
                      className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
                    >
                      <h3 className="font-bold text-xl mb-2">
                        {dealer.companyName || dealer.name}
                      </h3>
                      {dealer.companyName && dealer.name !== dealer.companyName && (
                        <p className="text-sm text-gray-600 mb-2">{dealer.name}</p>
                      )}
                      {dealer.dealerRating > 0 && (
                        <div className="mb-2">
                          <StarRating
                            rating={dealer.dealerRating}
                            count={dealer.dealerRatingCount}
                            size="sm"
                            showCount={true}
                          />
                        </div>
                      )}
                      <p className="text-sm text-gray-600">
                        {dealer.publishedVehiclesCount} vehículo{dealer.publishedVehiclesCount !== 1 ? 's' : ''} disponible{dealer.publishedVehiclesCount !== 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {dealer.sellersCount} vendedor{dealer.sellersCount !== 1 ? 'es' : ''}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Sin resultados */}
            {sellers.length === 0 && dealers.length === 0 && query.length >= 2 && (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-600">No se encontraron resultados para "{query}"</p>
              </div>
            )}
          </div>
        )}

        {/* Mensaje inicial */}
        {query.length < 2 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600">
              Escribe al menos 2 caracteres para comenzar la búsqueda
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

