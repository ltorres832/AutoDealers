'use client';

import { useState } from 'react';

interface SearchFilters {
  make?: string;
  model?: string;
  maxPrice?: string;
  condition?: string;
}

interface HeroSearchProps {
  onSearch: (filters: SearchFilters) => void;
}

export default function HeroSearch({ onSearch }: HeroSearchProps) {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell' | 'research'>('buy');

  // Advanced Search State
  const [selectedMake, setSelectedMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedPrice, setSelectedPrice] = useState('');
  const [searchType, setSearchType] = useState<string>('all'); // all, new, used

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      make: selectedMake || undefined,
      model: selectedModel || undefined,
      maxPrice: selectedPrice || undefined,
      condition: searchType !== 'all' ? searchType : undefined
    });
  };

  const tabs = [
    { id: 'buy', label: 'Comprar un Auto' },
    { id: 'sell', label: 'Vender/Cambiar' },
    { id: 'research', label: 'Reseñas' },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 sm:-mt-28 relative z-20">
      {/* Premium Tabs Container */}
      <div className="flex justify-center sm:justify-start space-x-2 sm:space-x-4 mb-0 sm:ml-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'buy' | 'sell' | 'research')}
            className={`px-6 sm:px-8 py-4 sm:py-5 rounded-t-2xl text-sm sm:text-base font-bold tracking-wide transition-all duration-300 ease-out border-b-0 ${activeTab === tab.id
              ? 'bg-white text-gray-900 shadow-[0_-15px_30px_-10px_rgba(0,0,0,0.15)] translate-y-2 z-10 scale-105'
              : 'bg-white/10 text-white hover:bg-white/25 hover:text-white backdrop-blur-md shadow-inner border border-white/10'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Glassmorphic Container */}
      <div className="bg-white rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] p-8 sm:p-10 animate-fade-in-up border border-gray-100">

        {/* --- BUY TAB --- */}
        {activeTab === 'buy' && (
          <form onSubmit={handleSearch} className="animate-fade-in">
            {/* Condition Radios - Premium Pills */}
            <div className="flex flex-wrap gap-4 mb-8">
              {[
                { value: 'all', label: 'Todos' },
                { value: 'new', label: 'Nuevos' },
                { value: 'used', label: 'Usados' },
              ].map((type) => (
                <label
                  key={type.value}
                  className={`relative cursor-pointer px-6 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 overflow-hidden ${searchType === type.value
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
                    className="absolute opacity-0 w-0 h-0" // Hide default radio
                  />
                  {type.label}
                </label>
              ))}
            </div>

            {/* Main Search Input & Button - High Contrast (Advanced Search Style) */}
            <div className="flex flex-col md:flex-row gap-4 relative z-20">
              <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Make Select */}
                <select
                  value={selectedMake}
                  onChange={(e) => setSelectedMake(e.target.value)}
                  className="w-full h-16 px-4 text-lg bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all font-medium text-gray-900 shadow-sm appearance-none cursor-pointer"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 1rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
                >
                  <option value="">Todas las Marcas</option>
                  <option value="toyota">Toyota</option>
                  <option value="honda">Honda</option>
                  <option value="ford">Ford</option>
                  <option value="chevrolet">Chevrolet</option>
                  <option value="nissan">Nissan</option>
                  <option value="bmw">BMW</option>
                  <option value="mercedes">Mercedes-Benz</option>
                  <option value="audi">Audi</option>
                </select>

                {/* Model Select */}
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  disabled={!selectedMake}
                  className="w-full h-16 px-4 text-lg bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all font-medium text-gray-900 shadow-sm appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 1rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
                >
                  <option value="">Todos los Modelos</option>
                  <option value="camry">Camry</option>
                  <option value="corolla">Corolla</option>
                  <option value="civic">Civic</option>
                  <option value="f-150">F-150</option>
                  <option value="silverado">Silverado</option>
                  <option value="mustang">Mustang</option>
                </select>

                {/* Price Select */}
                <select
                  value={selectedPrice}
                  onChange={(e) => setSelectedPrice(e.target.value)}
                  className="w-full h-16 px-4 text-lg bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all font-medium text-gray-900 shadow-sm appearance-none cursor-pointer"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 1rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
                >
                  <option value="">Precio Máximo</option>
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
                className="h-16 md:h-auto px-10 bg-gray-900 hover:bg-black text-white font-bold text-xl rounded-2xl shadow-xl hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] active:scale-95 transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-3"
              >
                <span>Buscar</span>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>

            {/* Quick Tags - Subtle Accents */}
            <div className="mt-6 flex flex-wrap gap-2 items-center justify-center sm:justify-start">
              <span className="text-sm font-semibold text-gray-400 mr-2 uppercase tracking-wider">Tendencias:</span>
              {['SUV', 'Pickup', 'Híbrido', 'Deportivo', 'Familiar'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setSelectedModel(tag); // For sake of demo we just set it to selected Model or we can just submit search
                    onSearch({ model: tag });
                  }}
                  className="px-4 py-1.5 border border-gray-200 hover:border-blue-400 text-gray-600 hover:text-blue-600 text-sm rounded-full font-medium transition-all hover:bg-blue-50"
                >
                  {tag}
                </button>
              ))}
            </div>
          </form>
        )}

        {/* --- SELL TAB --- */}
        {activeTab === 'sell' && (
          <div className="text-center py-6 animate-fade-in">
            <h3 className="text-3xl font-extrabold text-gray-900 mb-4 tracking-tight">Convierte tu auto en efectivo hoy</h3>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">Te conectamos con los mejores concesionarios para que obtengas la mejor oferta al instante. Cotización en minutos.</p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-3xl mx-auto">
              <div className="flex-grow relative">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 focus-within:text-green-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Ingresa Patente o Número VIN"
                  className="w-full h-16 pl-14 pr-4 border-2 border-gray-200 rounded-2xl text-xl font-medium focus:ring-4 focus:ring-green-100 focus:border-green-600 focus:bg-white bg-gray-50 outline-none transition-all placeholder-gray-400 uppercase"
                />
              </div>
              <button className="h-16 px-10 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl text-xl shadow-[0_10px_20px_-10px_rgba(22,163,74,0.5)] hover:shadow-[0_15px_30px_-10px_rgba(22,163,74,0.6)] hover:-translate-y-1 transition-all whitespace-nowrap">
                COTIZAR AHORA
              </button>
            </div>
          </div>
        )}

        {/* --- RESEARCH TAB --- */}
        {activeTab === 'research' && (
          <div className="text-center py-6 animate-fade-in">
            <h3 className="text-3xl font-extrabold text-gray-900 mb-4 tracking-tight">Conoce tu auto antes de comprar</h3>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">Descubre reseñas honestas, calculadoras financieras y comparativas reales hechas por expertos.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <button className="flex flex-col items-center p-8 bg-blue-50 border-2 border-transparent rounded-3xl hover:border-blue-500 hover:shadow-xl hover:-translate-y-2 transition-all group">
                <span className="text-5xl mb-4 group-hover:scale-110 transition-transform">⭐</span>
                <span className="font-bold text-gray-900 text-lg group-hover:text-blue-700">Reseñas de Usuarios</span>
              </button>
              <button className="flex flex-col items-center p-8 bg-purple-50 border-2 border-transparent rounded-3xl hover:border-purple-500 hover:shadow-xl hover:-translate-y-2 transition-all group">
                <span className="text-5xl mb-4 group-hover:scale-110 transition-transform">⚖️</span>
                <span className="font-bold text-gray-900 text-lg group-hover:text-purple-700">Comparar Autos</span>
              </button>
              <button className="flex flex-col items-center p-8 bg-emerald-50 border-2 border-transparent rounded-3xl hover:border-emerald-500 hover:shadow-xl hover:-translate-y-2 transition-all group">
                <span className="text-5xl mb-4 group-hover:scale-110 transition-transform">💳</span>
                <span className="font-bold text-gray-900 text-lg group-hover:text-emerald-700">Calcular Cuotas</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

