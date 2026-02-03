'use client';

import Link from 'next/link';
import StarRating from './StarRating';

interface Dealer {
  id: string;
  name: string;
  photo?: string;
  rating?: number;
  ratingCount?: number;
  vehicleCount?: number;
  location?: string;
}

interface FeaturedDealersProps {
  dealers: Dealer[];
}

export default function FeaturedDealers({ dealers }: FeaturedDealersProps) {
  const featured = dealers.slice(0, 6);

  if (featured.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">
          Dealers y Vendedores Destacados
        </h2>
        <p className="text-xl text-gray-600">
          Conoce a nuestros mejores vendedores y dealers
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {featured.map((dealer) => (
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
                    alt={dealer.name}
                    className="w-16 h-16 rounded-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect fill="%23ddd" width="64" height="64" rx="32"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="24" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3E👤%3C/text%3E%3C/svg%3E';
                      target.onerror = null;
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold">
                    {dealer.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition">
                    {dealer.name}
                  </h3>
                  {dealer.location && (
                    <p className="text-sm text-gray-600">📍 {dealer.location}</p>
                  )}
                </div>
              </div>

              {/* Rating */}
              {dealer.rating !== undefined && dealer.ratingCount !== undefined && (
                <div className="flex items-center gap-2 mb-4">
                  <StarRating rating={dealer.rating} count={dealer.ratingCount} />
                  <span className="text-sm text-gray-600">
                    ({dealer.ratingCount} {dealer.ratingCount === 1 ? 'reseña' : 'reseñas'})
                  </span>
                </div>
              )}

              {/* Vehicle Count */}
              {dealer.vehicleCount !== undefined && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                  <span className="text-lg">🚗</span>
                  <span>{dealer.vehicleCount} vehículos disponibles</span>
                </div>
              )}

              {/* Botón */}
              <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium transition-colors">
                Ver Perfil Completo
              </button>
            </div>
          </Link>
        ))}
      </div>

      <div className="text-center mt-8">
        <Link
          href="/dealers"
          className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-semibold transition-colors shadow-lg hover:shadow-xl"
        >
          Ver Todos los Dealers y Vendedores →
        </Link>
      </div>
    </div>
  );
}
