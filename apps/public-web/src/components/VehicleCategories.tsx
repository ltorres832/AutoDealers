'use client';

import Link from 'next/link';
import { VEHICLE_TYPES } from '@autodealers/inventory/client';

interface Category {
  id: string;
  name: string;
  description: string;
  count?: number;
}

// Usar los tipos compartidos desde el paquete inventory
const categories: Category[] = VEHICLE_TYPES.map(type => ({
  id: type.id,
  name: type.name,
  description: type.description,
}));

interface VehicleCategoriesProps {
  vehicleCounts?: Record<string, number>;
}

export default function VehicleCategories({ vehicleCounts }: VehicleCategoriesProps) {
  return (
    <section id="categories" className="py-16 bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Buscar por Tipo de Vehículo
          </h2>
          <p className="text-gray-600 text-lg">
            Explora nuestra amplia selección organizada por categoría
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {categories.map((category) => {
            const count = vehicleCounts?.[category.id] || 0;

            return (
              <Link
                key={category.id}
                href={`/category/${category.id}`}
                className="group relative bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-md transition-all duration-200 hover:-translate-y-1"
              >
                {/* Contenido */}
                <div className="text-center">
                  {/* Nombre */}
                  <h3 className="text-base font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {category.name}
                  </h3>

                  {/* Descripción */}
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2 min-h-[2.5rem]">
                    {category.description}
                  </p>

                  {/* Contador */}
                  {count > 0 ? (
                    <div className="inline-flex items-center justify-center px-2.5 py-1 bg-gray-100 rounded-full">
                      <span className="text-xs font-medium text-gray-700">
                        {count}
                      </span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center justify-center px-2.5 py-1 bg-gray-50 rounded-full">
                      <span className="text-xs text-gray-400">0</span>
                    </div>
                  )}
                </div>

                {/* Indicador de hover */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-200" />
              </Link>
            );
          })}
        </div>

        {/* Link a búsqueda avanzada */}
        <div className="mt-10 text-center">
          <Link
            href="/search"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
          >
            Ver búsqueda avanzada
            <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}

