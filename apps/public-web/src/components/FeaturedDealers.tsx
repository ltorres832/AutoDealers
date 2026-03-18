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
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full mb-6">
          <span className="text-blue-700 font-bold text-[10px] uppercase tracking-[0.2em]">Red Profesional</span>
        </div>
        <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
          Concesionarios Certificados
        </h2>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto font-medium">
          Trabajamos solo con los mejores para garantizar que tu experiencia de compra sea excepcional.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {featured.map((dealer) => (
          <Link
            key={dealer.id}
            href={`/dealer/${dealer.id}`}
            className="group bg-white rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.12)] transition-all duration-500 border border-slate-100 hover:border-blue-400 transform hover:-translate-y-2 relative overflow-hidden"
          >
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-bl-[4rem] -mr-8 -mt-8 transition-all duration-500 group-hover:bg-blue-100/50"></div>

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-8">
                <div className="relative">
                  {dealer.photo ? (
                    <img
                      src={dealer.photo}
                      alt={dealer.name}
                      className="w-20 h-20 rounded-2xl object-cover shadow-md border-2 border-white ring-4 ring-slate-50 transition-transform group-hover:scale-105"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect fill="%23ddd" width="64" height="64" rx="32"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="24" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3E👤%3C/text%3E%3C/svg%3E';
                        target.onerror = null;
                      }}
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center text-white text-2xl font-black shadow-lg border-2 border-white ring-4 ring-slate-50 transition-transform group-hover:scale-105">
                      {dealer.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {dealer.rating && dealer.rating >= 4.5 && (
                    <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white rounded-full p-1.5 shadow-lg border-2 border-white">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 00-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 00-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                {dealer.rating && dealer.rating >= 4.5 && (
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-100">
                    Socio Certificado
                  </span>
                )}
              </div>

              <h3 className="text-xl font-black text-slate-900 mb-2 truncate group-hover:text-blue-600 transition-colors">
                {dealer.name}
              </h3>

              {dealer.location && (
                <div className="flex items-center gap-1.5 text-slate-500 mb-6 font-medium text-sm">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {dealer.location}
                </div>
              )}

              {dealer.rating !== undefined && (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between mb-8 transition-colors group-hover:bg-white group-hover:border-blue-100">
                  <StarRating rating={dealer.rating} count={dealer.ratingCount || 0} />
                  <span className="text-xs font-black text-slate-400 uppercase tracking-tighter">
                    {dealer.ratingCount || 0} Opiniones
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Stock</span>
                  <span className="text-lg font-black text-slate-900">{dealer.vehicleCount || 0} <span className="text-sm font-medium text-slate-500 lowercase">autos</span></span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center transition-all duration-300 group-hover:bg-blue-600 group-hover:scale-110 shadow-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="text-center mt-16">
        <Link
          href="/dealers"
          className="inline-flex items-center gap-2 group text-blue-600 font-extrabold text-sm uppercase tracking-widest hover:text-blue-700 transition-all px-8 py-4 bg-white border-2 border-blue-100 rounded-2xl hover:border-blue-600 hover:shadow-xl"
        >
          Ver Todos los Concesionarios
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
        </Link>
      </div>
    </div>
  );
}
