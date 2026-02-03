'use client';

// Vista completa del caso del cliente - Todos los documentos en un solo lugar

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import CustomerFileManager from '@/components/CustomerFileManager';
import Link from 'next/link';

export default function CustomerCasePage() {
  const params = useParams();
  const customerId = params.id as string;
  
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [saleInfo, setSaleInfo] = useState<any>(null);
  const [vehicleInfo, setVehicleInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'contracts' | 'history'>('overview');

  useEffect(() => {
    fetchCustomerData();
  }, [customerId]);

  const fetchCustomerData = async () => {
    setLoading(true);
    try {
      // Obtener información del lead/cliente
      const leadResponse = await fetch(`/api/leads/${customerId}`, {
        credentials: 'include',
      });
      if (leadResponse.ok) {
        const leadData = await leadResponse.json();
        setCustomerInfo(leadData.lead);
      }

      // Obtener ventas relacionadas
      const salesResponse = await fetch(`/api/sales?leadId=${customerId}`, {
        credentials: 'include',
      });
      if (salesResponse.ok) {
        const salesData = await salesResponse.json();
        if (salesData.sales && salesData.sales.length > 0) {
          setSaleInfo(salesData.sales[0]);
          if (salesData.sales[0].vehicleId) {
            fetchVehicleInfo(salesData.sales[0].vehicleId);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicleInfo = async (vehicleId: string) => {
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setVehicleInfo(data.vehicle);
      }
    } catch (error) {
      console.error('Error fetching vehicle:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <Link
                href="/leads"
                className="text-blue-600 hover:text-blue-800"
              >
                ← Volver a Leads
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              📁 Caso del Cliente
            </h1>
            <p className="mt-2 text-gray-600">
              {customerInfo?.contact?.name || 'Cliente'} - Todos los documentos y registros en un solo lugar
            </p>
          </div>
        </div>
      </div>

      {/* Información del Cliente */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-blue-600 font-medium mb-1">Cliente</p>
            <p className="text-blue-900 font-bold text-lg">{customerInfo?.contact?.name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-blue-600 font-medium mb-1">Teléfono</p>
            <p className="text-blue-900 font-semibold">{customerInfo?.contact?.phone || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-blue-600 font-medium mb-1">Email</p>
            <p className="text-blue-900 font-semibold">{customerInfo?.contact?.email || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-blue-600 font-medium mb-1">Estado</p>
            <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
              customerInfo?.status === 'closed' ? 'bg-green-200 text-green-800' :
              customerInfo?.status === 'qualified' ? 'bg-blue-200 text-blue-800' :
              'bg-gray-200 text-gray-800'
            }`}>
              {customerInfo?.status || 'Nuevo'}
            </span>
          </div>
        </div>

        {saleInfo && (
          <div className="mt-4 pt-4 border-t border-blue-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-blue-600 font-medium mb-1">Venta</p>
                <p className="text-blue-900 font-semibold">
                  ${saleInfo.salePrice?.toLocaleString() || '0'} - {saleInfo.status === 'completed' ? '✓ Completada' : 'Pendiente'}
                </p>
              </div>
              {vehicleInfo && (
                <div>
                  <p className="text-xs text-blue-600 font-medium mb-1">Vehículo</p>
                  <p className="text-blue-900 font-semibold">
                    {vehicleInfo.year} {vehicleInfo.make} {vehicleInfo.model}
                  </p>
                </div>
              )}
              {saleInfo.completedAt && (
                <div>
                  <p className="text-xs text-blue-600 font-medium mb-1">Fecha de Venta</p>
                  <p className="text-blue-900 font-semibold">
                    {new Date(saleInfo.completedAt).toLocaleDateString('es-ES')}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: '📊 Resumen', icon: '📊' },
            { id: 'documents', label: '📁 Documentos', icon: '📁' },
            { id: 'contracts', label: '📄 Contratos', icon: '📄' },
            { id: 'history', label: '📜 Historial', icon: '📜' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenido de Tabs */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Información General</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Fuente</p>
                <p className="font-medium">{customerInfo?.source || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Fecha de Creación</p>
                <p className="font-medium">
                  {customerInfo?.createdAt ? new Date(customerInfo.createdAt).toLocaleDateString('es-ES') : 'N/A'}
                </p>
              </div>
              {customerInfo?.notes && (
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600">Notas</p>
                  <p className="font-medium">{customerInfo.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div>
          <CustomerFileManager
            customerId={customerId}
            saleId={saleInfo?.id}
            vehicleId={vehicleInfo?.id}
          />
        </div>
      )}

      {activeTab === 'contracts' && (
        <div className="space-y-4">
          <p className="text-gray-600">
            Los contratos aparecerán aquí una vez que se generen desde el proceso de venta.
          </p>
          {/* Aquí se pueden mostrar los contratos relacionados */}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          <p className="text-gray-600">
            El historial completo de interacciones aparecerá aquí.
          </p>
        </div>
      )}
    </div>
  );
}


