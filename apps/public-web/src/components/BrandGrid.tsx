'use client';

import Link from 'next/link';

const BRANDS = [
    { name: 'Toyota', logo: 'https://www.carlogos.org/car-logos/toyota-logo-2020-640.png' },
    { name: 'Honda', logo: 'https://www.carlogos.org/car-logos/honda-logo-1700x1150.png' },
    { name: 'Ford', logo: 'https://www.carlogos.org/car-logos/ford-logo-2017-640.png' },
    { name: 'Chevrolet', logo: 'https://www.carlogos.org/car-logos/chevrolet-logo-2013-640.png' },
    { name: 'Nissan', logo: 'https://www.carlogos.org/car-logos/nissan-logo-2020-640.png' },
    { name: 'Jeep', logo: 'https://www.carlogos.org/car-logos/jeep-logo-640.png' },
    { name: 'BMW', logo: 'https://www.carlogos.org/car-logos/bmw-logo-2020-640.png' },
    { name: 'Mercedes-Benz', logo: 'https://www.carlogos.org/car-logos/mercedes-benz-logo-640.png' },
];

export default function BrandGrid() {
    return (
        <section className="py-24 bg-slate-50 border-t border-slate-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-200 border border-slate-300 rounded-full mb-6">
                        <span className="text-slate-700 font-bold text-[10px] uppercase tracking-[0.2em]">Marcas Populares</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
                        Compra por Marca
                    </h2>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto font-medium">
                        Explora el inventario de las fabricantes más confiables del mercado.
                    </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-8">
                    {BRANDS.map((brand) => (
                        <Link
                            key={brand.name}
                            href={`/search?make=${brand.name}`}
                            className="group flex flex-col items-center gap-4 transition-all duration-300"
                        >
                            <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center p-6 shadow-sm border border-slate-200 transition-all duration-500 group-hover:shadow-xl group-hover:border-blue-400 group-hover:-translate-y-2">
                                <img
                                    src={brand.logo}
                                    alt={brand.name}
                                    className="max-w-full max-h-full object-contain grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-110"
                                />
                            </div>
                            <span className="text-xs font-black text-slate-500 group-hover:text-blue-600 transition-colors uppercase tracking-widest">
                                {brand.name}
                            </span>
                        </Link>
                    ))}
                </div>

                <div className="text-center mt-16">
                    <Link
                        href="/search"
                        className="inline-flex items-center gap-2 text-slate-900 font-black text-sm uppercase tracking-widest hover:text-blue-600 transition-colors"
                    >
                        Ver Todas las Marcas
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </Link>
                </div>
            </div>
        </section>
    );
}
