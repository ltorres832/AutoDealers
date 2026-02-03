'use client';

import { useState, useEffect } from 'react';
import { DashboardType, FeatureConfig } from '@autodealers/core';

interface DashboardFeatures {
  dashboard: DashboardType;
  features: FeatureConfig[];
}

export default function FeatureFlagsPage() {
  const [dashboards, setDashboards] = useState<DashboardFeatures[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    fetchFeatures();
  }, []);

  async function fetchFeatures() {
    try {
      setLoading(true);
      console.log('🔍 Obteniendo features...');
      
      const response = await fetch('/api/admin/feature-flags', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Features recibidas:', data);
        console.log(`   Dashboards: ${data.dashboards?.length || 0}`);
        
        if (data.dashboards) {
          data.dashboards.forEach((d: any) => {
            console.log(`   - ${d.dashboard}: ${d.features?.length || 0} features`);
          });
        }
        
        setDashboards(data.dashboards || []);
        setInitialized((data.dashboards || []).length > 0 && (data.dashboards || []).some((d: any) => d.features?.length > 0));
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Error fetching features:', response.status, errorData);
        if (response.status === 401) {
          alert('No autorizado. Por favor, cierra sesión y vuelve a iniciar sesión.');
        }
      }
    } catch (error: any) {
      console.error('❌ Error fetching features:', error);
      alert(`Error al obtener features: ${error.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  }

  async function initializeFeatures() {
    try {
      setSaving(true);
      console.log('🚀 Iniciando inicialización de features...');
      
      const response = await fetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'initialize' }),
      });

      const result = await response.json();
      console.log('📦 Respuesta del servidor:', result);

      if (response.ok) {
        console.log('✅ Features inicializadas exitosamente');
        console.log(`   Total: ${result.totalFeatures || 0} features`);
        console.log(`   Dashboards:`, result.dashboards?.map((d: any) => `${d.dashboard}: ${d.features?.length || 0}`).join(', ') || 'ninguno');
        
        setInitialized(true);
        
        // Actualizar el estado con los dashboards recibidos
        if (result.dashboards) {
          setDashboards(result.dashboards);
        } else {
          // Esperar un momento antes de recargar para asegurar que se guardaron
          setTimeout(async () => {
            await fetchFeatures();
          }, 2000);
        }
        
        alert(`Features inicializadas correctamente: ${result.totalFeatures || 0} features creadas`);
      } else {
        console.error('❌ Error al inicializar:', result);
        alert(result.error || 'Error al inicializar features');
      }
    } catch (error: any) {
      console.error('❌ Error:', error);
      alert(`Error al inicializar features: ${error.message || 'Error desconocido'}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleFeature(dashboard: DashboardType, featureKey: string, enabled: boolean) {
    try {
      setSaving(true);
      const response = await fetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dashboard,
          featureKey,
          enabled: !enabled,
        }),
      });

      if (response.ok) {
        await fetchFeatures();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al actualizar feature');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar feature');
    } finally {
      setSaving(false);
    }
  }

  async function handleBulkUpdate(updates: Array<{ dashboard: DashboardType; featureKey: string; enabled: boolean }>) {
    try {
      setSaving(true);
      const response = await fetch('/api/admin/feature-flags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      if (response.ok) {
        await fetchFeatures();
        alert(`${updates.length} features actualizadas correctamente`);
      } else {
        const error = await response.json();
        alert(error.error || 'Error al actualizar features');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar features');
    } finally {
      setSaving(false);
    }
  }

  const getDashboardLabel = (dashboard: DashboardType) => {
    const labels: Record<DashboardType, string> = {
      admin: 'Admin',
      dealer: 'Dealer',
      seller: 'Vendedor',
      public: 'Público',
    };
    return labels[dashboard] || dashboard;
  };

  const groupByCategory = (features: FeatureConfig[]) => {
    const grouped: Record<string, FeatureConfig[]> = {};
    features.forEach(feature => {
      const category = feature.category || 'Otros';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(feature);
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Feature Flags</h1>
          <p className="mt-2 text-gray-600">
            Habilita o deshabilita funciones específicas por dashboard
          </p>
        </div>
        <button
          onClick={initializeFeatures}
          disabled={saving || initialized}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {initialized ? '✓ Inicializado' : 'Inicializar Features'}
        </button>
      </div>

      {dashboards.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            No hay features configuradas. Haz clic en "Inicializar Features" para crear las configuraciones por defecto.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {dashboards.map((dashboardData) => {
            const grouped = groupByCategory(dashboardData.features);
            return (
              <div key={dashboardData.dashboard} className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">
                  Dashboard: {getDashboardLabel(dashboardData.dashboard)}
                </h2>

                {Object.keys(grouped).length === 0 ? (
                  <p className="text-gray-500">No hay features configuradas para este dashboard.</p>
                ) : (
                  Object.entries(grouped).map(([category, features]) => (
                    <div key={category} className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">{category}</h3>
                      <div className="space-y-2">
                        {features.map((feature) => (
                          <div
                            key={feature.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={feature.enabled}
                                  onChange={() => handleToggleFeature(
                                    dashboardData.dashboard,
                                    feature.featureKey,
                                    feature.enabled
                                  )}
                                  disabled={saving}
                                  className="h-5 w-5 text-blue-600 rounded"
                                />
                                <div>
                                  <span className={`font-medium ${feature.enabled ? 'text-gray-900' : 'text-gray-400'}`}>
                                    {feature.featureName}
                                  </span>
                                  {feature.description && (
                                    <p className="text-sm text-gray-500">{feature.description}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs ${
                              feature.enabled
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {feature.enabled ? 'Habilitado' : 'Deshabilitado'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

