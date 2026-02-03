'use client';

import Link from 'next/link';

interface Vehicle {
  id: string;
  tenantId: string;
  year: number;
  make: string;
  model: string;
  price: number;
  currency: string;
  photos: string[];
  mileage?: number;
  stockNumber?: string;
}

interface FeaturedVehiclesProps {
  vehicles: Vehicle[];
}

export default function FeaturedVehicles({ vehicles }: FeaturedVehiclesProps) {
  // Asegurar que vehicles sea un array
  const vehiclesArray = Array.isArray(vehicles) ? vehicles : [];
  
  // Ordenar y tomar los primeros 6
  const sortedVehicles = vehiclesArray.length > 0 ? [...vehiclesArray].sort((a: any, b: any) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  }) : [];
  
  const featured = sortedVehicles.slice(0, 6);

  return (
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

        {featured.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featured.map((vehicle) => (
            <div
              key={vehicle.id}
              className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all overflow-hidden group cursor-pointer border-2 border-transparent hover:border-blue-500"
              onClick={() => {
                window.location.href = `/${vehicle.tenantId}/vehicle/${vehicle.id}`;
              }}
            >
              {/* Badge Recién Agregado */}
              <div className="absolute top-4 right-4 z-10 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                <span>🆕</span>
                <span>Nuevo</span>
              </div>

              {/* Imagen */}
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
                  {vehicle.photos.length > 1 && (
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                      +{vehicle.photos.length - 1} fotos
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-56 bg-gray-200 flex items-center justify-center">
                  <div className="text-gray-400 text-6xl">🚗</div>
                </div>
              )}

              {/* Información */}
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
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No hay vehículos destacados en este momento</p>
          </div>
        )}

        {featured.length > 0 && (
        <div className="text-center mt-8">
          <Link
            href="#vehicles-section"
            className="inline-block bg-gray-200 text-gray-700 px-8 py-3 rounded-lg hover:bg-gray-300 font-semibold transition-colors"
          >
            Ver Todos los Vehículos →
          </Link>
        </div>
        )}
      </div>
    </section>
  );
}

