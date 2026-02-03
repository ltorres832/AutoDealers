'use client';

import { useState } from 'react';

interface FilterState {
  make: string;
  model: string;
  yearMin: string;
  yearMax: string;
  priceMin: string;
  priceMax: string;
  mileageMax: string;
  fuelType: string;
  transmission: string;
  condition: string;
  location: string;
  bodyType: string; // Categoría/tipo de vehículo
}

interface AdvancedFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  availableMakes: string[];
}

export default function AdvancedFilters({ filters, onFiltersChange, availableMakes }: AdvancedFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = (key: keyof FilterState, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const hasActiveFilters = filters.make !== 'all' || filters.model || filters.yearMin || filters.yearMax || 
    filters.priceMin || filters.priceMax || filters.mileageMax || filters.fuelType !== 'all' || 
    filters.transmission !== 'all' || filters.condition !== 'all' || filters.location || filters.bodyType !== 'all';

  return (
    <div className={`bg-gradient-to-br ${isExpanded ? 'from-blue-50 to-indigo-50' : 'from-white to-gray-50'} rounded-xl shadow-lg border-2 ${hasActiveFilters ? 'border-blue-400' : 'border-gray-200'} p-6 mb-6 transition-all duration-300`}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isExpanded ? 'bg-blue-600' : 'bg-gray-200'} transition-colors`}>
            <svg className={`w-6 h-6 ${isExpanded ? 'text-white' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Búsqueda Avanzada</h3>
            {hasActiveFilters && (
              <p className="text-sm text-blue-600 font-medium">Filtros activos</p>
            )}
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`px-6 py-2 rounded-lg font-semibold transition-all transform hover:scale-105 ${
            isExpanded 
              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg'
          }`}
        >
          {isExpanded ? (
            <>
              <span className="hidden sm:inline">Ocultar </span>Filtros
            </>
          ) : (
            <>
              <span className="hidden sm:inline">Ver </span>Búsqueda Avanzada
            </>
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Marca */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Marca</label>
            <select
              value={filters.make}
              onChange={(e) => updateFilter('make', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas</option>
              {availableMakes.map((make) => (
                <option key={make} value={make}>{make}</option>
              ))}
            </select>
          </div>

          {/* Modelo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Modelo</label>
            <input
              type="text"
              value={filters.model}
              onChange={(e) => updateFilter('model', e.target.value)}
              placeholder="Ej: Civic"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Año Mínimo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Año Mínimo</label>
            <input
              type="number"
              value={filters.yearMin}
              onChange={(e) => updateFilter('yearMin', e.target.value)}
              placeholder="2020"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Año Máximo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Año Máximo</label>
            <input
              type="number"
              value={filters.yearMax}
              onChange={(e) => updateFilter('yearMax', e.target.value)}
              placeholder="2024"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Precio Mínimo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Precio Mínimo</label>
            <input
              type="number"
              value={filters.priceMin}
              onChange={(e) => updateFilter('priceMin', e.target.value)}
              placeholder="$10,000"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Precio Máximo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Precio Máximo</label>
            <input
              type="number"
              value={filters.priceMax}
              onChange={(e) => updateFilter('priceMax', e.target.value)}
              placeholder="$50,000"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Millas Máximas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Millas Máximas</label>
            <input
              type="number"
              value={filters.mileageMax}
              onChange={(e) => updateFilter('mileageMax', e.target.value)}
              placeholder="50,000"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Tipo de Combustible */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Combustible</label>
            <select
              value={filters.fuelType}
              onChange={(e) => updateFilter('fuelType', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos</option>
              <option value="gasoline">Gasolina</option>
              <option value="diesel">Diésel</option>
              <option value="hybrid">Híbrido</option>
              <option value="electric">Eléctrico</option>
            </select>
          </div>

          {/* Transmisión */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Transmisión</label>
            <select
              value={filters.transmission}
              onChange={(e) => updateFilter('transmission', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas</option>
              <option value="automatic">Automática</option>
              <option value="manual">Manual</option>
              <option value="cvt">CVT</option>
            </select>
          </div>

          {/* Categoría/Tipo de Vehículo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
            <select
              value={filters.bodyType}
              onChange={(e) => updateFilter('bodyType', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas</option>
              <option value="suv">SUV</option>
              <option value="sedan">Sedán</option>
              <option value="pickup-truck">Pickup Truck</option>
              <option value="coupe">Cupé</option>
              <option value="hatchback">Hatchback</option>
              <option value="wagon">Wagon</option>
              <option value="convertible">Convertible</option>
              <option value="minivan">Minivan</option>
              <option value="van">Van</option>
              <option value="electric">Eléctrico</option>
              <option value="hybrid">Híbrido</option>
              <option value="plug-in-hybrid">Plug-in Híbrido</option>
              <option value="luxury">Lujo</option>
              <option value="crossover">Crossover</option>
            </select>
          </div>

          {/* Condición */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Condición</label>
            <select
              value={filters.condition}
              onChange={(e) => updateFilter('condition', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas</option>
              <option value="new">Nuevo</option>
              <option value="used">Usado</option>
              <option value="certified">Certificado</option>
            </select>
          </div>

          {/* Ubicación */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ubicación</label>
            <input
              type="text"
              value={filters.location}
              onChange={(e) => updateFilter('location', e.target.value)}
              placeholder="Ciudad o ZIP"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Botones de acción */}
      {isExpanded && (
        <div className="flex gap-4 mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={() => {
              onFiltersChange({
                make: 'all',
                model: '',
                yearMin: '',
                yearMax: '',
                priceMin: '',
                priceMax: '',
                mileageMax: '',
                fuelType: 'all',
                transmission: 'all',
                condition: 'all',
                location: '',
                bodyType: 'all',
              });
            }}
            className="px-6 py-2.5 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
          >
            Limpiar Todo
          </button>
          <button
            onClick={() => setIsExpanded(false)}
            className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold transition-all transform hover:scale-105 shadow-lg"
          >
            Aplicar Filtros
          </button>
        </div>
      )}
    </div>
  );
}

