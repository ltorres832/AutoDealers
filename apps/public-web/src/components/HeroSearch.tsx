'use client';

import { useState } from 'react';

interface HeroSearchProps {
  onSearch: (query: string) => void;
}

export default function HeroSearch({ onSearch }: HeroSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  const exampleQueries = [
    'Toyota RAV4 2020-2023',
    'Honda CR-V con menos de 50k millas',
    'Ford F-150 4x4 bajo $35,000',
    'Tesla Model 3 usado',
    'BMW X5 2019-2022',
    'Nissan Altima 2021-2023',
    'Chevrolet Silverado 1500',
    'Jeep Wrangler 4 puertas',
    'Hyundai Tucson híbrido',
    'Mazda CX-5 2020-2023',
    'Audi Q5 usado certificado',
    'Mercedes-Benz C-Class 2020+',
  ];

  return (
    <div className="relative w-full">
      {/* Search Form */}
      <div className="bg-white rounded-lg shadow-2xl p-6">
        <form onSubmit={handleSearch} className="mb-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                // Aquí podrías agregar lógica de sugerencias
              }}
              placeholder="Busca por marca, modelo, año, precio o características específicas..."
              className="w-full px-6 py-4 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
            <button
              type="submit"
              className="absolute right-2 top-2 bg-blue-600 text-white px-8 py-2 rounded-lg hover:bg-blue-700 font-semibold transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Buscar
            </button>
          </div>
        </form>

        {/* Example Queries */}
        <div className="mt-6">
          <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Búsquedas populares:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {exampleQueries.map((query, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSearchQuery(query);
                  onSearch(query);
                }}
                className="px-4 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 hover:border-blue-400 rounded-lg text-sm text-gray-800 font-medium transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 text-left"
                title={`Buscar: ${query}`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-3 h-3 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="truncate">{query}</span>
                </span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3 text-center flex items-center justify-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Tip: También puedes buscar por características como "4x4", "híbrido", "certificado", "menos de X millas", etc.</span>
          </p>
        </div>
      </div>
    </div>
  );
}

