'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { getFirstPhoto, handleImageError } from '@/lib/vehicle-image';
import { pingCatalogVehicleClick } from '@/lib/catalog-vehicle-click';

interface Vehicle {
  id: string;
  tenantId: string;
  year: number;
  make: string;
  model: string;
  price: number;
  currency: string;
  photos?: string[];
  images?: string[];
  mileage?: number;
  stockNumber?: string;
  createdAt?: string; // Nuevo campo para detectar "Recién llegado"
}

interface FeaturedVehiclesProps {
  vehicles: Vehicle[];
}

export default function FeaturedVehicles({ vehicles }: FeaturedVehiclesProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Asegurar que vehicles sea un array
  const vehiclesArray = Array.isArray(vehicles) ? vehicles : [];

  // Ordenar y tomar los primeros 10 para el scroll
  const sortedVehicles = vehiclesArray.length > 0 ? [...vehiclesArray].sort((a: any, b: any) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  }) : [];

  const featured = sortedVehicles.slice(0, 10);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -350, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 350, behavior: 'smooth' });
    }
  };

  return (
    <section className="brand-dark-section py-24 relative overflow-hidden">
      {/* Premium Dark Background decorative elements */}
      <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20 mix-blend-overlay"></div>
      <div className="absolute top-0 right-0 w-1/2 h-full bg-primary-600/10 blur-[120px] rounded-full transform translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-1/2 h-full bg-primary-600/10 blur-[120px] rounded-full transform -translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex justify-between items-end mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md text-white rounded-full mb-4 border border-white/10 shadow-lg">
              <span className="w-2 h-2 bg-primary-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(225,6,0,0.8)]"></span>
              <span className="font-bold text-xs tracking-widest uppercase text-primary-100">En Tiempo Real</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
              Recién Llegados
            </h2>
            <p className="text-lg text-slate-300 mt-4 max-w-xl font-medium">
              Los últimos vehículos agregados a nuestra plataforma en los últimos minutos. Descubre tu próximo auto antes que nadie.
            </p>
          </div>

          <div className="hidden md:flex gap-3">
            <button
              onClick={scrollLeft}
              className="w-14 h-14 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white hover:text-slate-900 transition-all duration-300 group"
              aria-label="Anterior"
            >
              <svg className="w-6 h-6 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button
              onClick={scrollRight}
              className="w-14 h-14 flex items-center justify-center rounded-full bg-primary-600 text-white border border-primary-500 hover:bg-primary-500 transition-all duration-300 shadow-[0_0_20px_rgba(225, 6, 0,0.4)] hover:shadow-[0_0_30px_rgba(225, 6, 0,0.6)] group"
              aria-label="Siguiente"
            >
              <svg className="w-6 h-6 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>

        {featured.length > 0 ? (
          <div
            ref={scrollContainerRef}
            className="flex gap-8 overflow-x-auto pb-12 snap-x snap-mandatory scrollbar-hide pt-4 pl-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {featured.map((vehicle) => {
              // Calcular si es "nuevo" (menos de 48h)
              const isNew = true; // Por ahora asumimos todos son nuevos en esta sección

              return (
                <div
                  key={vehicle.id}
                  className="relative flex-shrink-0 w-[min(100%,20rem)] md:w-[21rem] bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 snap-start overflow-hidden border border-slate-200 hover:border-primary-300 group cursor-pointer"
                  onClick={() => {
                    pingCatalogVehicleClick({
                      vehicleId: vehicle.id,
                      tenantId: vehicle.tenantId,
                      surface: 'featured_carousel',
                    });
                    window.location.href = `/${vehicle.tenantId}/vehicle/${vehicle.id}`;
                  }}
                >
                  {/* Badge Recién Agregado */}
                  {isNew && (
                    <div className="absolute top-4 left-4 z-30 bg-primary-600 text-white px-3 py-1.5 rounded-full text-[10px] uppercase font-bold tracking-widest shadow-lg flex items-center gap-1.5 border border-primary-400">
                      <span>🔥</span>
                      <span>NUEVO</span>
                    </div>
                  )}

                  <div className="relative w-full h-44 bg-slate-100 overflow-hidden">
                    {(() => {
                      const firstPhoto = getFirstPhoto(vehicle);
                      if (firstPhoto) {
                        return (
                          <img
                            src={firstPhoto}
                            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={handleImageError}
                          />
                        );
                      }
                      return (
                        <div className="h-full w-full flex items-center justify-center bg-white text-slate-300">
                          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2m-12 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0zm10 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0z" /></svg>
                        </div>
                      );
                    })()}

                  </div>

                  <div className="p-4 bg-white">
                    <p className="text-xl font-bold text-slate-900 tabular-nums">
                      {vehicle.currency} {vehicle.price.toLocaleString()}
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-slate-800 group-hover:text-primary-600 transition-colors line-clamp-2">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </h3>
                    <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500 mt-2">
                      <span className="bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                        {(vehicle.mileage ?? 0).toLocaleString()} millas
                      </span>
                      <span className="bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                        #{vehicle.stockNumber || 'N/A'}
                      </span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <span className="text-primary-600 text-sm font-bold inline-flex items-center gap-1.5">
                        Ver Detalles
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Call to action final card */}
            <Link
              href="/search"
              className="flex-shrink-0 w-64 md:w-80 bg-slate-800 rounded-3xl shadow-xl flex flex-col items-center justify-center p-8 text-white snap-start hover:scale-[1.02] transition-transform cursor-pointer border border-slate-700 hover:border-primary-500 hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary-600/20 to-primary-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center mb-6 text-3xl shadow-inner group-hover:scale-110 transition-transform duration-500 relative z-10">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </div>
              <h3 className="text-2xl font-extrabold text-center mb-3 relative z-10">Ver Catálogo</h3>
              <p className="text-slate-400 text-center text-sm font-medium relative z-10 group-hover:text-primary-200 transition-colors">Descubre {vehiclesArray.length}+ excelentes opciones esperándote</p>
            </Link>
          </div>
        ) : (
          <div className="text-center py-24 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary-500 to-transparent opacity-50"></div>
            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-slate-700">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-t-2 border-primary-400"></div>
            </div>
            <p className="text-slate-300 text-xl font-medium tracking-wide">Analizando inventario en tiempo real...</p>
          </div>
        )}
      </div>
    </section>
  );
}

