'use client';

import Link from 'next/link';

const CATEGORY_DISPLAY: Record<string, { label: string; image: string; color: string; gradient: string }> = {
  sedan: {
    label: 'Sedán',
    image: '/sedan_category_1773634522734.png',
    color: 'text-blue-600',
    gradient: 'from-blue-600/20 to-blue-900/40'
  },
  suv: {
    label: 'SUV',
    image: '/suv_category_1773634541924.png',
    color: 'text-emerald-600',
    gradient: 'from-emerald-600/20 to-emerald-900/40'
  },
  pickup: {
    label: 'Pickup',
    image: '/pickup_category_1773634558726.png',
    color: 'text-orange-600',
    gradient: 'from-orange-600/20 to-orange-900/40'
  },
  deportivo: {
    label: 'Deportivo',
    image: '/sports_category_1773634575517.png',
    color: 'text-red-600',
    gradient: 'from-red-600/20 to-red-900/40'
  },
  minivan: {
    label: 'Miniván',
    image: '/minivan_category_1773634597825.png',
    color: 'text-indigo-600',
    gradient: 'from-indigo-600/20 to-indigo-900/40'
  },
  'hibrido-ev': {
    label: 'Híbrido/EV',
    image: '/electric_category_1773634619169.png',
    color: 'text-teal-600',
    gradient: 'from-teal-600/20 to-teal-900/40'
  },
};

interface VehicleCategoriesProps {
  vehicleCounts?: Record<string, number>;
}

export default function VehicleCategories({ vehicleCounts }: VehicleCategoriesProps) {
  const categories = Object.entries(CATEGORY_DISPLAY);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-full mb-6">
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">Colecciones</span>
        </div>
        <h2 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 tracking-tight">
          Explora Nuestro <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Catálogo</span>
        </h2>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
          Encuentra el vehículo perfecto para tu estilo de vida entre nuestras categorías más populares.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {categories.map(([id, data]) => (
          <Link
            key={id}
            href={`/search?bodyType=${id}`}
            className="group relative h-80 rounded-[2.5rem] overflow-hidden bg-slate-100 shadow-[0_15px_35px_-5px_rgba(0,0,0,0.05)] hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.15)] transition-all duration-700 hover:-translate-y-2"
          >
            {/* Background Image */}
            <div className="absolute inset-0 transition-transform duration-1000 group-hover:scale-110">
              <img
                src={data.image}
                alt={data.label}
                className="w-full h-full object-cover"
              />
              <div className={`absolute inset-0 bg-gradient-to-b ${data.gradient} mix-blend-multiply opacity-40`}></div>
            </div>

            {/* Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent"></div>

            {/* Content */}
            <div className="absolute inset-0 p-8 flex flex-col justify-end">
              <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                <span className={`inline-block px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-black uppercase tracking-widest mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-500`}>
                  Premium
                </span>
                <h3 className="text-2xl md:text-3xl font-black text-white tracking-tighter mb-2">
                  {data.label}
                </h3>
                {vehicleCounts && vehicleCounts[id] !== undefined && (
                  <div className="flex items-center gap-1.5 text-white/70 text-[10px] font-bold uppercase tracking-widest mb-2 group-hover:text-white transition-colors">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    {vehicleCounts[id]} {vehicleCounts[id] === 1 ? 'Vehículo' : 'Vehículos'}
                  </div>
                )}
                <div className="h-1 w-0 group-hover:w-16 bg-white transition-all duration-500 rounded-full"></div>
              </div>
            </div>

            {/* Icon Overlay (Bottom Right) */}
            <div className="absolute top-6 right-6 w-12 h-12 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 transform scale-75 group-hover:scale-100">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-20 flex justify-center">
        <Link
          href="/search"
          className="group relative flex items-center gap-4 px-12 py-6 bg-white border border-slate-200 rounded-[2.5rem] shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
        >
          <span className="text-slate-900 font-black text-lg uppercase tracking-widest">Explora Catálogo Full</span>
          <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center group-hover:translate-x-2 transition-transform duration-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </div>
        </Link>
      </div>
    </div>
  );
}
