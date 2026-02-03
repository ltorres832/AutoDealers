'use client';

import { useState, useEffect } from 'react';

interface MaintenanceMode {
  enabled: boolean;
  message: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  currentEnd?: string;
  affectedDashboards: ('admin' | 'dealer' | 'seller' | 'public')[];
}

export default function MaintenancePage() {
  const [mode, setMode] = useState<MaintenanceMode>({
    enabled: false,
    message: '',
    affectedDashboards: ['admin', 'dealer', 'seller', 'public'],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMaintenanceMode();
  }, []);

  async function fetchMaintenanceMode() {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/maintenance', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setMode({
          enabled: data.enabled || false,
          message: data.message || '',
          scheduledStart: data.scheduledStart,
          scheduledEnd: data.scheduledEnd,
          currentEnd: data.currentEnd,
          affectedDashboards: data.affectedDashboards || ['admin', 'dealer', 'seller', 'public'],
        });
      }
    } catch (error) {
      console.error('Error fetching maintenance mode:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      const response = await fetch('/api/admin/maintenance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(mode),
      });

      if (response.ok) {
        alert('Modo de mantenimiento actualizado correctamente');
        await fetchMaintenanceMode();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al actualizar modo de mantenimiento');
      }
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Error: ${error.message || 'Error desconocido'}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Modo de Mantenimiento</h1>
        <p className="mt-2 text-gray-600">
          Activa o desactiva el modo de mantenimiento para todos los dashboards
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={mode.enabled}
              onChange={(e) => setMode({ ...mode, enabled: e.target.checked })}
              className="h-5 w-5 text-blue-600 rounded"
            />
            <span className="text-lg font-medium text-gray-900">
              Activar Modo de Mantenimiento
            </span>
          </label>
          <p className="text-sm text-gray-500 mt-1 ml-8">
            Cuando está activo, los usuarios verán un mensaje de mantenimiento y no podrán acceder a sus dashboards.
          </p>
        </div>

        {mode.enabled && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mensaje de Mantenimiento *
              </label>
              <textarea
                value={mode.message}
                onChange={(e) => setMode({ ...mode, message: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="La plataforma está en mantenimiento. Por favor, vuelve más tarde."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha y Hora de Finalización Estimada
              </label>
              <input
                type="datetime-local"
                value={mode.currentEnd ? new Date(mode.currentEnd).toISOString().slice(0, 16) : ''}
                onChange={(e) => setMode({ 
                  ...mode, 
                  currentEnd: e.target.value ? new Date(e.target.value).toISOString() : undefined 
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 mt-1">
                El modo de mantenimiento se desactivará automáticamente después de esta fecha.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dashboards Afectados
              </label>
              <div className="space-y-2">
                {(['admin', 'dealer', 'seller', 'public'] as const).map((dashboard) => (
                  <label key={dashboard} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={mode.affectedDashboards.includes(dashboard)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setMode({
                            ...mode,
                            affectedDashboards: [...mode.affectedDashboards, dashboard],
                          });
                        } else {
                          setMode({
                            ...mode,
                            affectedDashboards: mode.affectedDashboards.filter(d => d !== dashboard),
                          });
                        }
                      }}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700 capitalize">
                      {dashboard === 'admin' ? 'Admin' : 
                       dashboard === 'dealer' ? 'Dealer' :
                       dashboard === 'seller' ? 'Vendedor' : 'Público'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end space-x-3">
          <button
            onClick={handleSave}
            disabled={saving || (mode.enabled && !mode.message)}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </div>
    </div>
  );
}


