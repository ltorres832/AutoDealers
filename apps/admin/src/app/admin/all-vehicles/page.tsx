'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Vehicle {
  id: string;
  tenantId: string;
  tenantName?: string;
  make: string;
  model: string;
  year: number;
  price: number;
  status: string;
  createdAt: string;
  photos?: string[];
  videos?: string[];
}

export default function AdminAllVehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [fixingStock, setFixingStock] = useState(false);
  const [fixResult, setFixResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showDebug, setShowDebug] = useState(true);
  const [debugInfo, setDebugInfo] = useState<{
    status: string;
    vehiclesCount: number;
    error?: string;
    responseStatus?: number;
  }>({ status: 'inicializando', vehiclesCount: 0 });
  const [filters, setFilters] = useState({
    tenantId: '',
    status: '',
    search: '',
  });

  useEffect(() => {
    fetchVehicles();
  }, [filters]);

  async function fetchVehicles() {
    setLoading(true);
    setDebugInfo({ status: 'cargando', vehiclesCount: 0 });
    
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const url = `/api/admin/all-vehicles?${params.toString()}`;
      setDebugInfo(prev => ({ ...prev, status: `consultando: ${url}` }));

      const response = await fetch(url, {
        credentials: 'include', // IMPORTANTE: Incluir cookies
      });
      
      setDebugInfo(prev => ({ 
        ...prev, 
        responseStatus: response.status,
        status: response.ok ? 'respuesta recibida' : `error ${response.status}`
      }));
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        setDebugInfo({
          status: 'error',
          vehiclesCount: 0,
          error: errorData.error || `Error ${response.status}: ${response.statusText}`,
          responseStatus: response.status,
        });
        setVehicles([]);
        return;
      }
      
      const data = await response.json();
      const vehiclesCount = data.vehicles?.length || 0;
      
      setDebugInfo({
        status: 'exito',
        vehiclesCount,
        responseStatus: response.status,
      });
      
      setVehicles(data.vehicles || []);
    } catch (error: any) {
      setDebugInfo({
        status: 'error',
        vehiclesCount: 0,
        error: error.message || 'Error desconocido',
      });
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }

  async function fixAllStockNumbers() {
    if (!confirm('¿Estás seguro de que quieres agregar stockNumbers a todos los vehículos que no lo tienen?')) {
      return;
    }

    setFixingStock(true);
    setFixResult(null);
    
    try {
      const response = await fetch('/api/admin/vehicles/fix-stock', {
        method: 'POST',
        credentials: 'include', // IMPORTANTE: Incluir cookies
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), // Sin tenantId para corregir todos
      });

      let data;
      try {
        const text = await response.text();
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        data = { error: `Error parseando respuesta: ${response.status} ${response.statusText}` };
      }
      
      if (response.ok) {
        setFixResult({
          success: true,
          message: `✅ Corregidos ${data.fixed || 0} vehículos. ${data.skipped || 0} ya tenían stockNumber. ${data.message || ''}`,
        });
        // Recargar vehículos después de 2 segundos
        setTimeout(() => {
          fetchVehicles();
        }, 2000);
      } else {
        setFixResult({
          success: false,
          message: `❌ Error ${response.status}: ${data.error || data.details || response.statusText || 'Error desconocido'}`,
        });
      }
    } catch (error: any) {
      console.error('Error fixing stock numbers:', error);
      setFixResult({
        success: false,
        message: `❌ Error de red: ${error.message || 'No se pudo conectar al servidor'}`,
      });
    } finally {
      setFixingStock(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Todos los Vehículos</h1>
          <p className="text-gray-600">
            Vista y gestión de todo el inventario de todos los tenants
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fixAllStockNumbers}
            disabled={fixingStock}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {fixingStock ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Corrigiendo...
              </>
            ) : (
              <>
                <span>🔧</span>
                Corregir Stock Numbers
              </>
            )}
          </button>
          <Link
            href="/admin/vehicles/create"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <span>➕</span>
            Crear Vehículo
          </Link>
        </div>
      </div>

      {fixResult && (
        <div className={`mb-4 p-4 rounded-lg ${
          fixResult.success ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'
        }`}>
          {fixResult.message}
        </div>
      )}

      {/* Panel de Debug Visible */}
      <div className="mb-4 bg-gray-100 border border-gray-300 rounded-lg p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-gray-800">🔍 Información de Debug</h3>
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            {showDebug ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
        
        {showDebug && (
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-semibold">Estado:</span>{' '}
                <span className={
                  debugInfo.status === 'exito' ? 'text-green-600' :
                  debugInfo.status === 'error' ? 'text-red-600' :
                  'text-blue-600'
                }>
                  {debugInfo.status}
                </span>
              </div>
              <div>
                <span className="font-semibold">Vehículos encontrados:</span>{' '}
                <span className="text-blue-600 font-bold">{debugInfo.vehiclesCount}</span>
              </div>
              {debugInfo.responseStatus && (
                <div>
                  <span className="font-semibold">Status HTTP:</span>{' '}
                  <span className={
                    debugInfo.responseStatus === 200 ? 'text-green-600' : 'text-red-600'
                  }>
                    {debugInfo.responseStatus}
                  </span>
                </div>
              )}
              <div>
                <span className="font-semibold">Cargando:</span>{' '}
                <span className={loading ? 'text-yellow-600' : 'text-gray-600'}>
                  {loading ? 'Sí' : 'No'}
                </span>
              </div>
            </div>
            
            {debugInfo.error && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                <span className="font-semibold text-red-800">Error:</span>{' '}
                <span className="text-red-600">{debugInfo.error}</span>
                {debugInfo.responseStatus === 401 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm font-semibold text-red-800">💡 Tu sesión ha expirado</p>
                    <p className="text-xs text-red-700">Por favor, vuelve a iniciar sesión para continuar.</p>
                    <div className="flex gap-2 mt-3">
                      <a
                        href="/login"
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium transition-colors"
                      >
                        🔐 Ir a Iniciar Sesión
                      </a>
                      <button
                        onClick={() => {
                          // Limpiar cookies y localStorage
                          document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                          localStorage.removeItem('authToken');
                          localStorage.removeItem('userEmail');
                          localStorage.removeItem('userId');
                          // Redirigir al login
                          window.location.href = '/login';
                        }}
                        className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm font-medium transition-colors"
                      >
                        🚪 Cerrar Sesión y Redirigir
                      </button>
                    </div>
                  </div>
                )}
                {debugInfo.responseStatus === 403 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm font-semibold text-red-800">🚫 No tienes permisos de administrador</p>
                    <p className="text-xs text-red-700">
                      Estás autenticado pero tu cuenta no tiene el rol de administrador necesario para ver esta página.
                    </p>
                    <p className="text-xs text-red-700 font-semibold mt-2">
                      Solución: Contacta al administrador del sistema para que te asigne el rol de admin.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => {
                          // Limpiar cookies y localStorage
                          document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                          localStorage.removeItem('authToken');
                          localStorage.removeItem('userEmail');
                          localStorage.removeItem('userId');
                          // Redirigir al login
                          window.location.href = '/login';
                        }}
                        className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm font-medium transition-colors"
                      >
                        🚪 Cerrar Sesión
                      </button>
                      <a
                        href="/admin/global"
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
                      >
                        🏠 Ir al Dashboard
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {vehicles.length > 0 && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                <span className="font-semibold text-green-800">✅ Vehículos cargados correctamente</span>
                <div className="mt-1 text-xs text-gray-600">
                  Primeros 3 vehículos: {vehicles.slice(0, 3).map(v => `${v.year} ${v.make} ${v.model}`).join(', ')}
                  {vehicles.length > 3 && '...'}
                </div>
              </div>
            )}
            
            {vehicles.length === 0 && !loading && debugInfo.status === 'exito' && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                <span className="font-semibold text-yellow-800">⚠️ No hay vehículos que mostrar</span>
                <div className="mt-1 text-xs text-gray-600">
                  Esto puede ser normal si no hay vehículos creados aún o si los filtros están ocultando todos los resultados.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Buscar por marca, modelo..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="border rounded px-3 py-2"
          />
          <input
            type="text"
            placeholder="Tenant ID..."
            value={filters.tenantId}
            onChange={(e) => setFilters({ ...filters, tenantId: e.target.value })}
            className="border rounded px-3 py-2"
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="border rounded px-3 py-2"
          >
            <option value="">Todos los estados</option>
            <option value="available">Disponible</option>
            <option value="sold">Vendido</option>
            <option value="reserved">Reservado</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {vehicles.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 text-lg">No hay vehículos registrados</p>
            <p className="text-gray-400 text-sm mt-2">Los vehículos aparecerán aquí cuando se agreguen al inventario</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Vehículo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Media
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Precio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {vehicles.map((vehicle) => (
              <tr key={vehicle.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm">
                  {vehicle.tenantName || vehicle.tenantId}
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    {vehicle.photos && vehicle.photos.length > 0 && (
                      <span className="flex items-center gap-1">
                        📷 {vehicle.photos.length}
                      </span>
                    )}
                    {vehicle.videos && vehicle.videos.length > 0 && (
                      <span className="flex items-center gap-1">
                        🎥 {vehicle.videos.length}
                      </span>
                    )}
                    {(!vehicle.photos || vehicle.photos.length === 0) && 
                     (!vehicle.videos || vehicle.videos.length === 0) && (
                      <span className="text-gray-400">Sin media</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  ${vehicle.price.toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs capitalize">
                    {vehicle.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(vehicle.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <a
                    href={`/admin/tenants/${vehicle.tenantId}`}
                    className="text-primary-600 hover:text-primary-700 text-sm"
                  >
                    Ver Tenant
                  </a>
                </td>
              </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

