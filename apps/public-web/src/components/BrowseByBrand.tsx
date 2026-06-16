'use client';

import Link from 'next/link';
import { useRef } from 'react';

const POPULAR_BRANDS = [
    { name: 'Toyota', logo: 'T', color: 'bg-red-600' },
    { name: 'Honda', logo: 'H', color: 'bg-primary-700' },
    { name: 'Ford', logo: 'F', color: 'bg-primary-600' },
    { name: 'Chevrolet', logo: 'C', color: 'bg-yellow-500' },
    { name: 'Nissan', logo: 'N', color: 'bg-red-700' },
    { name: 'BMW', logo: 'B', color: 'bg-primary-500' },
    { name: 'Mercedes', logo: 'M', color: 'bg-gray-800' },
    { name: 'Audi', logo: 'A', color: 'bg-black' },
    { name: 'Hyundai', logo: 'H', color: 'bg-primary-800' },
    { name: 'Kia', logo: 'K', color: 'bg-red-600' },
    { name: 'Jeep', logo: 'J', color: 'bg-green-700' },
    { name: 'Ram', logo: 'R', color: 'bg-black' },
];

export default function BrowseByBrand() {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scrollLeft = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
        }
    };

    const scrollRight = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
        }
    };

    return (
        <section className="py-16 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900">Explora por Marca</h2>
                        <p className="text-gray-600 mt-2">Encuentra tu vehículo ideal de tus marcas favoritas</p>
                    </div>
                    <div className="hidden md:flex gap-2">
                        <button
                            onClick={scrollLeft}
                            className="p-2 rounded-full border border-gray-300 hover:bg-gray-100 transition-colors"
                            aria-label="Scroll left"
                        >
                            <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <button
                            onClick={scrollRight}
                            className="p-2 rounded-full border border-gray-300 hover:bg-gray-100 transition-colors"
                            aria-label="Scroll right"
                        >
                            <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div
                    ref={scrollContainerRef}
                    className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory scrollbar-hide"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {POPULAR_BRANDS.map((brand) => (
                        <Link
                            key={brand.name}
                            href={`/search?make=${brand.name}`}
                            className="flex-shrink-0 w-40 h-40 bg-gray-50 rounded-xl flex flex-col items-center justify-center p-4 hover:shadow-lg hover:scale-105 transition-all duration-300 border border-gray-100 group snap-start"
                        >
                            <div className={`w-16 h-16 ${brand.color} rounded-full flex items-center justify-center text-white text-2xl font-bold mb-3 shadow-md group-hover:shadow-xl transition-shadow`}>
                                {brand.logo}
                            </div>
                            <span className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">{brand.name}</span>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
