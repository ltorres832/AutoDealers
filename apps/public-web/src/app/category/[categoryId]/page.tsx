'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

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
  bodyType?: string;
  specifications?: {
    bodyType?: string;
    fuelType?: string;
    transmission?: string;
  };
}

const categoryInfo: Record<string, { name: string; description: string; color: string }> = {
  'suv': { name: 'SUV', description: 'Vehículos utilitarios deportivos', color: 'from-blue-500 to-cyan-500' },
  'luxury': { name: 'Lujo', description: 'Experiencia premium', color: 'from-yellow-400 to-amber-600' },
  'crossover': { name: 'Crossover', description: 'Lo mejor de ambos mundos', color: 'from-indigo-500 to-purple-500' },
  'sedan': { name: 'Sedán', description: 'Elegancia y comodidad', color: 'from-purple-500 to-pink-500' },
  'pickup-truck': { name: 'Pickup Truck', description: 'Potencia y versatilidad', color: 'from-orange-500 to-red-500' },
  'coupe': { name: 'Cupé', description: 'Estilo deportivo', color: 'from-red-500 to-pink-500' },
  'hatchback': { name: 'Hatchback', description: 'Compacto y eficiente', color: 'from-green-500 to-emerald-500' },
  'wagon': { name: 'Wagon', description: 'Espacio y funcionalidad', color: 'from-indigo-500 to-purple-500' },
  'convertible': { name: 'Convertible', description: 'Aire libre y estilo', color: 'from-yellow-500 to-orange-500' },
  'minivan': { name: 'Minivan', description: 'Ideal para familias', color: 'from-teal-500 to-cyan-500' },
  'van': { name: 'Van', description: 'Carga y transporte', color: 'from-gray-600 to-gray-800' },
  'electric': { name: 'Eléctricos', description: 'Tecnología sostenible', color: 'from-green-400 to-green-600' },
  'hybrid': { name: 'Híbridos', description: 'Eficiencia avanzada', color: 'from-blue-400 to-blue-600' },
  'plug-in-hybrid': { name: 'Plug-in Híbrido', description: 'Flexibilidad energética', color: 'from-purple-400 to-purple-600' },
};

export default function CategoryPage() {
  const params = useParams();
  const categoryId = params.categoryId as string;
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'year-desc' | 'mileage-asc'>('price-asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const category = categoryInfo[categoryId] || { name: 'Categoría', description: '', color: 'from-gray-500 to-gray-700' };

  useEffect(() => {
    fetchVehicles();
  }, [categoryId]);

  async function fetchVehicles() {
    setLoading(true);
    try {
      const response = await fetch('/api/public/vehicles?status=available');
      if (response.ok) {
        const data = await response.json();
        // Filtrar por categoría (normalizando ambos valores para comparar)
        const normalizedCategoryId = String(categoryId).trim().toLowerCase();
        const filtered = data.vehicles?.filter((v: Vehicle) => {
          const vehicleBodyType = v.bodyType || v.specifications?.bodyType;
          if (!vehicleBodyType) return false;
          const normalizedVehicleType = String(vehicleBodyType).trim().toLowerCase();
          return normalizedVehicleType === normalizedCategoryId;
        }) || [];
        setVehicles(filtered);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  }

  // Aplicar ordenamiento
  const sortedVehicles = [...vehicles].sort((a, b) => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando vehículos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href="/" className="text-blue-600 hover:underline flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al Inicio
          </Link>
        </div>
      </nav>

      {/* Hero Section de Categoría */}
      <section className={`bg-gradient-to-br ${category.color} text-white py-16`}>
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-4">{category.name}</h1>
          <p className="text-xl text-white/90 mb-6">{category.description}</p>
          <p className="text-lg text-white/80">
            {vehicles.length} {vehicles.length === 1 ? 'vehículo disponible' : 'vehículos disponibles'}
          </p>
        </div>
      </section>

      {/* Controles */}
      <section className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {vehicles.length} {vehicles.length === 1 ? 'vehículo encontrado' : 'vehículos encontrados'}
              </h2>
            </div>
            
            <div className="flex items-center gap-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="price-asc">Precio: Menor a Mayor</option>
                <option value="price-desc">Precio: Mayor a Menor</option>
                <option value="year-desc">Año: Más Reciente</option>
                <option value="mileage-asc">Millas: Menor a Mayor</option>
              </select>
              
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  ⏹️ Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  ☰ Lista
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Listado de Vehículos */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          {vehicles.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🚗</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No hay vehículos en esta categoría</h3>
              <p className="text-gray-600 mb-6">Intenta buscar en otras categorías</p>
              <Link
                href="/"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
              >
                Ver Todas las Categorías
              </Link>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedVehicles.map((vehicle) => (
                <Link
                  key={vehicle.id}
                  href={`/${vehicle.tenantId}/vehicle/${vehicle.id}`}
                  className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 overflow-hidden group"
                >
                  {vehicle.photos && vehicle.photos.length > 0 && vehicle.photos[0] ? (
                    <div className="relative h-48 bg-gray-200 overflow-hidden">
                      <img
                        src={vehicle.photos[0]}
                        alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3E🚗%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="h-48 bg-gray-200 flex items-center justify-center">
                      <span className="text-6xl">🚗</span>
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-2">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </h3>
                    <p className="text-2xl font-bold text-blue-600 mb-2">
                      {vehicle.currency} {vehicle.price.toLocaleString()}
                    </p>
                    {vehicle.mileage && (
                      <p className="text-sm text-gray-600 mb-2">
                        {vehicle.mileage.toLocaleString()} km
                      </p>
                    )}
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {vehicle.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {sortedVehicles.map((vehicle) => (
                <Link
                  key={vehicle.id}
                  href={`/${vehicle.tenantId}/vehicle/${vehicle.id}`}
                  className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all p-6 flex gap-6 group"
                >
                  {vehicle.photos && vehicle.photos.length > 0 && vehicle.photos[0] ? (
                    <div className="relative w-64 h-48 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={vehicle.photos[0]}
                        alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3E🚗%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-64 h-48 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-6xl">🚗</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </h3>
                    <p className="text-3xl font-bold text-blue-600 mb-3">
                      {vehicle.currency} {vehicle.price.toLocaleString()}
                    </p>
                    <div className="flex gap-6 mb-3">
                      {vehicle.mileage && (
                        <span className="text-gray-600">
                          📏 {vehicle.mileage.toLocaleString()} km
                        </span>
                      )}
                      <span className="text-gray-600 capitalize">
                        {vehicle.condition}
                      </span>
                      {vehicle.specifications?.fuelType && (
                        <span className="text-gray-600 capitalize">
                          ⛽ {vehicle.specifications.fuelType}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-700 line-clamp-3">
                      {vehicle.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

