'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { getFirstPhoto, handleImageError } from '@/lib/vehicle-image';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { pingCatalogVehicleClick } from '@/lib/catalog-vehicle-click';
import PublicBackButton from '@/components/PublicBackButton';

interface Vehicle {
  id: string;
  tenantId: string;
  tenantName?: string;
  make: string;
  model: string;
  year: number;
  price: number;
  currency: string;
  photos?: string[];
  images?: string[];
  mileage?: number;
  condition: string;
  description: string;
  specifications?: {
    transmission?: string;
    fuelType?: string;
    engine?: string;
    doors?: number;
    seats?: number;
    color?: string;
    interiorColor?: string;
    mpgCity?: number;
    mpgHighway?: number;
    drivetrain?: string;
    vin?: string;
    stockNumber?: string;
    bodyType?: string;
  };
  bodyType?: string;
  stockNumber?: string;
}

function ComparePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const vehicleIds = searchParams.get('vehicles')?.split(',') || [];
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (vehicleIds.length === 0) {
      router.push('/');
      return;
    }

    fetchVehicles();
  }, [vehicleIds.join(',')]);

  async function fetchVehicles() {
    setLoading(true);
    try {
      const allVehicles: Vehicle[] = [];
      
      for (const vehicleId of vehicleIds) {
        try {
          // Intentar obtener el vehículo directamente
          const response = await fetch(`/api/public/vehicles/${vehicleId}`);
          if (response.ok) {
            const data = await response.json();
            allVehicles.push(data.vehicle);
          } else {
            // Si no funciona, buscar en la lista completa
            const listResponse = await fetch('/api/public/vehicles?status=available');
            if (listResponse.ok) {
              const listData = await listResponse.json();
              const found = listData.vehicles?.find((v: Vehicle) => v.id === vehicleId);
              if (found) {
                allVehicles.push(found);
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching vehicle ${vehicleId}:`, error);
        }
      }

      setVehicles(allVehicles);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  }

  function removeVehicle(vehicleId: string) {
    const newIds = vehicleIds.filter(id => id !== vehicleId);
    if (newIds.length === 0) {
      router.push('/');
    } else {
      router.push(`/compare?vehicles=${newIds.join(',')}`);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando comparación...</p>
        </div>
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚗</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No se encontraron vehículos</h2>
          <p className="text-gray-600 mb-6">Los vehículos seleccionados no están disponibles</p>
          <PublicBackButton
            fallbackHref="/"
            className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium"
          >
            ← Volver
          </PublicBackButton>
        </div>
      </div>
    );
  }

  const comparisonFields = [
    { label: 'Año', key: 'year' },
    { label: 'Marca', key: 'make' },
    { label: 'Modelo', key: 'model' },
    { label: 'Precio', key: 'price' },
    { label: 'Millaje', key: 'mileage' },
    { label: 'Condición', key: 'condition' },
    { label: 'Transmisión', key: 'specifications.transmission' },
    { label: 'Combustible', key: 'specifications.fuelType' },
    { label: 'Motor', key: 'specifications.engine' },
    { label: 'Puertas', key: 'specifications.doors' },
    { label: 'Asientos', key: 'specifications.seats' },
    { label: 'Color Exterior', key: 'specifications.color' },
    { label: 'Color Interior', key: 'specifications.interiorColor' },
    { label: 'MPG Ciudad', key: 'specifications.mpgCity' },
    { label: 'MPG Carretera', key: 'specifications.mpgHighway' },
    { label: 'Tracción', key: 'specifications.drivetrain' },
    { label: 'VIN', key: 'specifications.vin' },
    { label: 'Stock #', key: 'stockNumber' },
    { label: 'Categoría', key: 'bodyType' },
  ];

  function getFieldValue(vehicle: Vehicle, fieldKey: string): string {
    if (fieldKey === 'price') {
      return `${vehicle.currency} ${vehicle.price.toLocaleString()}`;
    }
    if (fieldKey === 'mileage') {
      return `${(vehicle.mileage ?? 0).toLocaleString()} millas`;
    }
    if (fieldKey === 'stockNumber') {
      return vehicle.stockNumber || vehicle.specifications?.stockNumber || 'N/A';
    }
    if (fieldKey === 'bodyType') {
      return vehicle.bodyType || vehicle.specifications?.bodyType || 'N/A';
    }
    if (fieldKey.startsWith('specifications.')) {
      const specKey = fieldKey.replace('specifications.', '');
      return vehicle.specifications?.[specKey as keyof typeof vehicle.specifications]?.toString() || 'N/A';
    }
    return (vehicle as any)[fieldKey]?.toString() || 'N/A';
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <PublicBackButton
              fallbackHref="/"
              className="text-primary-600 hover:underline flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver
            </PublicBackButton>
            <h1 className="text-2xl font-bold text-gray-900">Comparar Vehículos</h1>
            <div className="w-24"></div>
          </div>
        </div>
      </nav>

      {/* Comparación */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          {/* Tarjetas de vehículos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {vehicles.map((vehicle, index) => (
              <div key={vehicle.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                {getFirstPhoto(vehicle) ? (
                  <div className="relative h-48 bg-white border-b border-gray-100">
                    <img
                      src={getFirstPhoto(vehicle)!}
                      alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                      className="w-full h-full object-contain object-center"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={handleImageError}
                    />
                    <button
                      onClick={() => removeVehicle(vehicle.id)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition"
                      title="Eliminar de comparación"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="h-48 bg-white flex items-center justify-center relative border-b border-gray-100">
                    <span className="text-6xl">🚗</span>
                    <button
                      onClick={() => removeVehicle(vehicle.id)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition"
                      title="Eliminar de comparación"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
                <div className="p-4">
                  <h3 className="text-xl font-bold mb-2">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </h3>
                  <p className="text-2xl font-bold text-primary-600 mb-2">
                    {vehicle.currency} {vehicle.price.toLocaleString()}
                  </p>
                  {vehicle.tenantName && (
                    <p className="text-sm text-gray-600 mb-4">De: {vehicle.tenantName}</p>
                  )}
                  <Link
                    href={`/${vehicle.tenantId}/vehicle/${vehicle.id}`}
                    className="block w-full bg-primary-600 text-white text-center py-2 rounded-lg hover:bg-primary-700 transition font-medium"
                    onClick={() =>
                      pingCatalogVehicleClick({
                        vehicleId: vehicle.id,
                        tenantId: vehicle.tenantId,
                        surface: 'compare',
                      })
                    }
                  >
                    Ver Detalles
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Tabla de comparación */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">
                      Característica
                    </th>
                    {vehicles.map((vehicle) => (
                      <th
                        key={vehicle.id}
                        className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200 last:border-r-0"
                      >
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonFields.map((field, index) => (
                    <tr
                      key={field.key}
                      className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-200">
                        {field.label}
                      </td>
                      {vehicles.map((vehicle) => (
                        <td
                          key={vehicle.id}
                          className="px-6 py-4 text-sm text-gray-700 text-center border-r border-gray-200 last:border-r-0 capitalize"
                        >
                          {getFieldValue(vehicle, field.key)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Acciones */}
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/"
              className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 font-medium"
            >
              Buscar Más Vehículos
            </Link>
            {vehicles.length < 3 && (
              <Link
                href="/"
                className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium"
              >
                Agregar Vehículo
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={null}>
      <ComparePageContent />
    </Suspense>
  );
}
