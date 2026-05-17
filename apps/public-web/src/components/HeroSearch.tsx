'use client';

import { useMemo, useState } from 'react';

export interface HeroSearchFilters {
  make?: string;
  model?: string;
  priceMax?: string;
  condition?: string;
  bodyType?: string;
}

interface HeroSearchProps {
  vehicles: Array<{ make?: string; model?: string; price?: number }>;
  onSearch: (filters: HeroSearchFilters) => void;
}

const TREND_TAGS: Array<{ label: string; bodyType: string }> = [
  { label: 'SUV', bodyType: 'suv' },
  { label: 'Pickup', bodyType: 'pickup' },
  { label: 'Híbrido', bodyType: 'hybrid' },
  { label: 'Deportivo', bodyType: 'coupe' },
  { label: 'Familiar', bodyType: 'van' },
];

export default function HeroSearch({ vehicles, onSearch }: HeroSearchProps) {
  const [selectedMake, setSelectedMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedPrice, setSelectedPrice] = useState('');
  const [searchType, setSearchType] = useState<string>('all');

  const makes = useMemo(() => {
    const set = new Set<string>();
    for (const v of vehicles) {
      if (v.make?.trim()) set.add(v.make.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [vehicles]);

  const modelsForMake = useMemo(() => {
    if (!selectedMake) return [];
    const set = new Set<string>();
    const makeLower = selectedMake.toLowerCase();
    for (const v of vehicles) {
      if ((v.make || '').toLowerCase() === makeLower && v.model?.trim()) {
        set.add(v.model.trim());
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [vehicles, selectedMake]);

  function scrollToInventory() {
    const target = document.getElementById('vehicles');
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY - 88;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }

  function submit(filters: HeroSearchFilters) {
    onSearch(filters);
    requestAnimationFrame(() => {
      setTimeout(scrollToInventory, 80);
    });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    submit({
      make: selectedMake || undefined,
      model: selectedModel || undefined,
      priceMax:
        selectedPrice && selectedPrice !== 'no-max' ? selectedPrice : undefined,
      condition: searchType !== 'all' ? searchType : undefined,
    });
  }

  return (
    <div className="w-full max-w-5xl mx-auto -mt-24 sm:-mt-28 relative z-20">
      <div className="bg-white rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] p-8 sm:p-10 border border-gray-100">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 text-center sm:text-left">
          Buscar vehículo
        </h2>

        <form onSubmit={handleSearch}>
          <div className="flex flex-wrap gap-3 mb-6">
            {[
              { value: 'all', label: 'Todos' },
              { value: 'new', label: 'Nuevos' },
              { value: 'used', label: 'Usados' },
            ].map((type) => (
              <label
                key={type.value}
                className={`cursor-pointer px-6 py-2.5 rounded-full font-semibold text-sm transition-all ${
                  searchType === type.value
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="type"
                  value={type.value}
                  checked={searchType === type.value}
                  onChange={(e) => setSearchType(e.target.value)}
                  className="sr-only"
                />
                {type.label}
              </label>
            ))}
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4">
              <select
                value={selectedMake}
                onChange={(e) => {
                  setSelectedMake(e.target.value);
                  setSelectedModel('');
                }}
                className="w-full h-14 px-4 text-base bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-600 font-medium text-gray-900"
              >
                <option value="">Todas las marcas</option>
                {makes.map((make) => (
                  <option key={make} value={make}>
                    {make}
                  </option>
                ))}
              </select>

              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={!selectedMake}
                className="w-full h-14 px-4 text-base bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-600 font-medium text-gray-900 disabled:opacity-50"
              >
                <option value="">Todos los modelos</option>
                {modelsForMake.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>

              <select
                value={selectedPrice}
                onChange={(e) => setSelectedPrice(e.target.value)}
                className="w-full h-14 px-4 text-base bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-600 font-medium text-gray-900"
              >
                <option value="">Precio máximo</option>
                <option value="10000">$10,000</option>
                <option value="20000">$20,000</option>
                <option value="30000">$30,000</option>
                <option value="40000">$40,000</option>
                <option value="50000">$50,000</option>
                <option value="75000">$75,000</option>
                <option value="100000">$100,000</option>
                <option value="no-max">Sin límite</option>
              </select>
            </div>

            <button
              type="submit"
              className="h-14 md:h-auto px-10 bg-gray-900 hover:bg-black text-white font-bold text-lg rounded-2xl shadow-xl transition-all whitespace-nowrap flex items-center justify-center gap-2"
            >
              Buscar
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </button>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 items-center">
            <span className="text-sm font-semibold text-gray-400 mr-1 uppercase tracking-wider">
              Tendencias:
            </span>
            {TREND_TAGS.map((tag) => (
              <button
                key={tag.label}
                type="button"
                onClick={() =>
                  submit({
                    bodyType: tag.bodyType,
                    condition: searchType !== 'all' ? searchType : undefined,
                  })
                }
                className="px-4 py-1.5 border border-gray-200 hover:border-blue-400 text-gray-600 hover:text-blue-600 text-sm rounded-full font-medium transition-all hover:bg-blue-50"
              >
                {tag.label}
              </button>
            ))}
          </div>
        </form>
      </div>
    </div>
  );
}
