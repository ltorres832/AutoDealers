'use client';

// Página para crear un nuevo cliente F&I

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function NewFIClientPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    identification: '',
    vehicleId: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
    vehiclePrice: '',
    downPayment: '',
    hasTradeIn: false,
    tradeInMake: '',
    tradeInModel: '',
    tradeInYear: '',
    tradeInValue: '',
  });

  // Pre-llenar datos si vienen de query params (desde Casos de Cliente)
  useEffect(() => {
    const customerName = searchParams.get('customerName');
    const customerPhone = searchParams.get('customerPhone');
    const customerEmail = searchParams.get('customerEmail');
    const vehicleId = searchParams.get('vehicleId');
    const vehicleMake = searchParams.get('vehicleMake');
    const vehicleModel = searchParams.get('vehicleModel');
    const vehicleYear = searchParams.get('vehicleYear');
    const vehiclePrice = searchParams.get('vehiclePrice');

    if (customerName || customerPhone || customerEmail || vehicleId) {
      setFormData((prev) => ({
        ...prev,
        name: customerName || prev.name,
        phone: customerPhone || prev.phone,
        email: customerEmail || prev.email,
        vehicleId: vehicleId || prev.vehicleId,
        // Pre-llenar información del vehículo si viene en los params
        vehicleMake: vehicleMake || prev.vehicleMake,
        vehicleModel: vehicleModel || prev.vehicleModel,
        vehicleYear: vehicleYear || prev.vehicleYear,
        vehiclePrice: vehiclePrice || prev.vehiclePrice,
      }));

      // Si hay vehicleId pero no hay información del vehículo en params, obtenerla
      if (vehicleId && !vehicleMake && !vehicleModel) {
        fetch(`/api/vehicles?id=${vehicleId}`, { credentials: 'include' })
          .then((res) => {
            if (!res.ok) {
              throw new Error(`HTTP ${res.status}`);
            }
            return res.json();
          })
          .then((data) => {
            console.log('🚗 Información del vehículo obtenida:', data);
            if (data.vehicle) {
              setFormData((prev) => ({
                ...prev,
                vehicleId: vehicleId,
                vehicleMake: data.vehicle.make || prev.vehicleMake,
                vehicleModel: data.vehicle.model || prev.vehicleModel,
                vehicleYear: data.vehicle.year?.toString() || prev.vehicleYear,
                vehiclePrice: data.vehicle.price?.toString() || prev.vehiclePrice,
              }));
            } else {
              console.warn('⚠️ No se encontró información del vehículo en la respuesta');
            }
          })
          .catch((error) => {
            console.error('❌ Error fetching vehicle:', error);
            // Continuar sin información del vehículo
          });
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('📝 Creando cliente F&I:', {
        name: formData.name,
        phone: formData.phone,
      });

      const response = await fetch('/api/fi/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          email: formData.email || undefined,
          address: formData.address || undefined,
          identification: formData.identification || undefined,
          vehicleId: formData.vehicleId || undefined,
          vehicleMake: formData.vehicleMake || undefined,
          vehicleModel: formData.vehicleModel || undefined,
          vehicleYear: formData.vehicleYear ? parseInt(formData.vehicleYear) : undefined,
          vehiclePrice: formData.vehiclePrice ? parseFloat(formData.vehiclePrice) : undefined,
          downPayment: formData.downPayment ? parseFloat(formData.downPayment) : undefined,
          hasTradeIn: formData.hasTradeIn,
          tradeInDetails: formData.hasTradeIn ? {
            make: formData.tradeInMake || undefined,
            model: formData.tradeInModel || undefined,
            year: formData.tradeInYear ? parseInt(formData.tradeInYear) : undefined,
            estimatedValue: formData.tradeInValue ? parseFloat(formData.tradeInValue) : undefined,
          } : undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Cliente creado exitosamente:', data.client);
        router.push(`/fi/clients/${data.client.id}/request`);
      } else {
        const error = await response.json();
        console.error('❌ Error al crear cliente:', error);
        alert(error.error || 'Error al crear cliente');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear cliente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href="/fi" className="text-blue-600 hover:text-blue-700 text-sm">
          ← Volver a F&I
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Nuevo Cliente F&I</h1>
      <p className="text-gray-600 mb-8">
        Completa la información del cliente para crear una solicitud F&I
      </p>

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
        {/* Datos Básicos */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Datos Básicos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre Completo *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dirección
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Identificación (Opcional)
              </label>
              <input
                type="text"
                value={formData.identification}
                onChange={(e) => setFormData({ ...formData, identification: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Datos del Vehículo */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Datos del Vehículo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marca
              </label>
              <input
                type="text"
                value={formData.vehicleMake}
                onChange={(e) => setFormData({ ...formData, vehicleMake: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Modelo
              </label>
              <input
                type="text"
                value={formData.vehicleModel}
                onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Año
              </label>
              <input
                type="number"
                value={formData.vehicleYear}
                onChange={(e) => setFormData({ ...formData, vehicleYear: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.vehiclePrice}
                onChange={(e) => setFormData({ ...formData, vehiclePrice: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pronto (Down Payment)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.downPayment}
                onChange={(e) => setFormData({ ...formData, downPayment: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Trade-In */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="hasTradeIn"
              checked={formData.hasTradeIn}
              onChange={(e) => setFormData({ ...formData, hasTradeIn: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="hasTradeIn" className="ml-2 text-sm font-medium text-gray-700">
              Tiene Trade-In
            </label>
          </div>

          {formData.hasTradeIn && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marca Trade-In
                </label>
                <input
                  type="text"
                  value={formData.tradeInMake}
                  onChange={(e) => setFormData({ ...formData, tradeInMake: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Modelo Trade-In
                </label>
                <input
                  type="text"
                  value={formData.tradeInModel}
                  onChange={(e) => setFormData({ ...formData, tradeInModel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Año Trade-In
                </label>
                <input
                  type="number"
                  value={formData.tradeInYear}
                  onChange={(e) => setFormData({ ...formData, tradeInYear: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor Estimado
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.tradeInValue}
                  onChange={(e) => setFormData({ ...formData, tradeInValue: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-4">
          <Link
            href="/fi"
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Crear Cliente y Continuar'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewFIClientPage() {
  return (
    <Suspense fallback={
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="bg-white shadow rounded-lg p-6">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-4">
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    }>
      <NewFIClientPageContent />
    </Suspense>
  );
}

