'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Reminder {
  id: string;
  type: 'oil_change' | 'filter' | 'oil_change_filter' | 'tire_rotation' | 'custom';
  customType?: string;
  frequency: 'monthly' | '3_months' | '6_months' | 'manual';
  nextReminder: string;
  channels: ('email' | 'sms' | 'whatsapp')[];
  status: 'active' | 'completed' | 'cancelled';
  sentAt?: string;
  createdAt: string;
  customer?: {
    id: string;
    name: string;
    phone: string;
    email: string;
  } | null;
  vehicle?: {
    id: string;
    name: string;
    make: string;
    model: string;
    year: string;
  } | null;
}

const REMINDER_TYPE_NAMES: Record<string, string> = {
  oil_change: 'Cambio de Aceite',
  filter: 'Cambio de Filtro',
  oil_change_filter: 'Cambio de Aceite y Filtro',
  tire_rotation: 'Rotación de Llantas',
  custom: 'Personalizado',
};

const FREQUENCY_NAMES: Record<string, string> = {
  monthly: 'Mensual',
  '3_months': 'Cada 3 meses',
  '6_months': 'Cada 6 meses',
  manual: 'Manual',
};

const CHANNEL_NAMES: Record<string, string> = {
  email: '📧 Email',
  sms: '📱 SMS',
  whatsapp: '💬 WhatsApp',
};

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Debug: log cuando cambia el estado
  useEffect(() => {
    console.log('showCreateModal changed to:', showCreateModal);
  }, [showCreateModal]);

  useEffect(() => {
    fetchReminders();
  }, [filter]);

  // Debug: log cuando cambia el estado del modal
  useEffect(() => {
    console.log('showCreateModal state:', showCreateModal);
  }, [showCreateModal]);

  async function fetchReminders() {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.append('status', filter);
      }

      const response = await fetch(`/api/reminders?${params.toString()}`);
      const data = await response.json();
      
      if (response.ok) {
        setReminders(data.reminders || []);
      } else {
        setError(data.error || 'Error al cargar los recordatorios');
        console.error('API Error:', data);
      }
    } catch (error: any) {
      console.error('Error fetching reminders:', error);
      setError('Error de conexión. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    const styles = {
      active: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    const labels = {
      active: 'Activo',
      completed: 'Completado',
      cancelled: 'Cancelado',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.active}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const pendingReminders = reminders.filter((r) => {
    if (r.status !== 'active') return false;
    const nextDate = new Date(r.nextReminder);
    return nextDate <= new Date();
  });

  const upcomingReminders = reminders.filter((r) => {
    if (r.status !== 'active') return false;
    const nextDate = new Date(r.nextReminder);
    return nextDate > new Date();
  });

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Recordatorios Programados</h1>
          <p className="text-gray-600">Gestiona los recordatorios post-venta programados para tus clientes</p>
        </div>
        <button
          onClick={() => {
            console.log('Button clicked, current state:', showCreateModal);
            setShowCreateModal(true);
            console.log('State updated to true');
          }}
          className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium flex items-center gap-2 cursor-pointer transition-colors"
          type="button"
        >
          <span>➕</span>
          <span>Crear Recordatorio</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex gap-2">
        {(['all', 'active', 'completed', 'cancelled'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === f
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {f === 'all' ? 'Todos' : f === 'active' ? 'Activos' : f === 'completed' ? 'Completados' : 'Cancelados'}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-red-600 mr-2">⚠️</span>
            <p className="text-red-800">{error}</p>
            <button
              onClick={fetchReminders}
              className="ml-auto px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Cargando recordatorios...</p>
        </div>
      ) : (
        <>
          {/* Resumen */}
          {filter === 'all' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-sm text-red-600 font-medium mb-1">Pendientes</div>
                <div className="text-2xl font-bold text-red-700">{pendingReminders.length}</div>
                <div className="text-xs text-red-600 mt-1">Requieren atención</div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="text-sm text-yellow-600 font-medium mb-1">Próximos</div>
                <div className="text-2xl font-bold text-yellow-700">{upcomingReminders.length}</div>
                <div className="text-xs text-yellow-600 mt-1">Programados</div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-sm text-green-600 font-medium mb-1">Total Activos</div>
                <div className="text-2xl font-bold text-green-700">{reminders.filter((r) => r.status === 'active').length}</div>
                <div className="text-xs text-green-600 mt-1">En el sistema</div>
              </div>
            </div>
          )}

          {/* Lista de recordatorios */}
          {reminders.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <div className="text-6xl mb-4">📅</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay recordatorios</h3>
              <p className="text-gray-600">
                {filter === 'all'
                  ? 'No hay recordatorios programados. Los recordatorios se crean automáticamente cuando se registra una venta.'
                  : `No hay recordatorios ${filter === 'active' ? 'activos' : filter === 'completed' ? 'completados' : 'cancelados'}.`}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehículo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frecuencia</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Próximo Recordatorio</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Canales</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reminders.map((reminder) => {
                      const nextDate = new Date(reminder.nextReminder);
                      const isOverdue = reminder.status === 'active' && nextDate <= new Date();
                      return (
                        <tr key={reminder.id} className={isOverdue ? 'bg-red-50' : 'hover:bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {reminder.customer ? (
                              <div>
                                <div className="text-sm font-medium text-gray-900">{reminder.customer.name}</div>
                                <div className="text-sm text-gray-500">{reminder.customer.phone}</div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">Cliente no encontrado</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {reminder.vehicle ? (
                              <div className="text-sm text-gray-900">{reminder.vehicle.name}</div>
                            ) : (
                              <span className="text-sm text-gray-400">Vehículo no encontrado</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {reminder.type === 'custom' && reminder.customType
                                ? reminder.customType
                                : REMINDER_TYPE_NAMES[reminder.type] || reminder.type}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{FREQUENCY_NAMES[reminder.frequency] || reminder.frequency}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                              {formatDate(reminder.nextReminder)}
                            </div>
                            {isOverdue && <div className="text-xs text-red-500 mt-1">⚠️ Vencido</div>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-wrap gap-1">
                              {reminder.channels.map((channel) => (
                                <span key={channel} className="text-xs">
                                  {CHANNEL_NAMES[channel] || channel}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(reminder.status)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {showCreateModal && typeof window !== 'undefined' && createPortal(
        <CreateReminderModal
          onClose={() => {
            console.log('Modal onClose called');
            setShowCreateModal(false);
            fetchReminders();
          }}
        />,
        document.body
      )}
    </div>
  );
}

function CreateReminderModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    customerId: '',
    vehicleId: '',
    type: 'oil_change_filter' as 'oil_change' | 'filter' | 'oil_change_filter' | 'tire_rotation' | 'custom',
    customType: '',
    frequency: '3_months' as 'monthly' | '3_months' | '6_months' | 'manual',
    nextReminder: new Date().toISOString().slice(0, 16),
    channels: [] as ('email' | 'sms' | 'whatsapp')[],
  });
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<Array<{ id: string; name: string }>>([]);
  const [vehicles, setVehicles] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoadingData(true);
      const [leadsRes, vehiclesRes] = await Promise.all([
        fetch('/api/leads'),
        fetch('/api/vehicles'),
      ]);

      if (leadsRes.ok) {
        const leadsData = await leadsRes.json();
        setLeads(
          (leadsData.leads || []).map((lead: any) => ({
            id: lead.id,
            name: lead.contact?.name || `Lead ${lead.id}`,
          }))
        );
      }

      if (vehiclesRes.ok) {
        const vehiclesData = await vehiclesRes.json();
        setVehicles(
          (vehiclesData.vehicles || []).map((vehicle: any) => ({
            id: vehicle.id,
            name: `${vehicle.make || ''} ${vehicle.model || ''} ${vehicle.year || ''}`.trim() || `Vehículo ${vehicle.id}`,
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoadingData(false);
    }
  }

  function handleChannelToggle(channel: 'email' | 'sms' | 'whatsapp') {
    setFormData((prev) => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter((c) => c !== channel)
        : [...prev.channels, channel],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.customerId || !formData.vehicleId || formData.channels.length === 0) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: formData.customerId,
          vehicleId: formData.vehicleId,
          type: formData.type,
          customType: formData.type === 'custom' ? formData.customType : undefined,
          frequency: formData.frequency,
          nextReminder: new Date(formData.nextReminder).toISOString(),
          channels: formData.channels,
        }),
      });

      if (response.ok) {
        onClose();
      } else {
        const data = await response.json();
        alert(data.error || 'Error al crear el recordatorio');
      }
    } catch (error) {
      console.error('Error creating reminder:', error);
      alert('Error al crear el recordatorio');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Prevenir scroll del body cuando el modal está abierto
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      style={{ zIndex: 99999, position: 'fixed' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4 relative"
        onClick={(e) => e.stopPropagation()}
        style={{ zIndex: 100000 }}
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Crear Recordatorio</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Cliente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cliente <span className="text-red-500">*</span>
            </label>
            {loadingData ? (
              <div className="text-gray-500">Cargando clientes...</div>
            ) : (
              <select
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              >
                <option value="">Seleccionar cliente...</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Vehículo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vehículo <span className="text-red-500">*</span>
            </label>
            {loadingData ? (
              <div className="text-gray-500">Cargando vehículos...</div>
            ) : (
              <select
                value={formData.vehicleId}
                onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              >
                <option value="">Seleccionar vehículo...</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Tipo de Recordatorio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Recordatorio <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value as any, customType: '' })
              }
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value="oil_change_filter">Cambio de Aceite y Filtro</option>
              <option value="oil_change">Cambio de Aceite (solo)</option>
              <option value="filter">Cambio de Filtro (solo)</option>
              <option value="tire_rotation">Rotación de Neumáticos</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>

          {/* Tipo Personalizado */}
          {formData.type === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción del Recordatorio <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.customType}
                onChange={(e) => setFormData({ ...formData, customType: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Ej: Revisión general, Cambio de batería, etc."
                required={formData.type === 'custom'}
              />
            </div>
          )}

          {/* Frecuencia */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Frecuencia <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value="monthly">Mensual</option>
              <option value="3_months">Cada 3 meses</option>
              <option value="5_months">Cada 5 meses</option>
              <option value="6_months">Cada 6 meses</option>
              <option value="manual">Manual (sin repetición automática)</option>
            </select>
          </div>

          {/* Próximo Recordatorio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha del Próximo Recordatorio <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={formData.nextReminder}
              onChange={(e) => setFormData({ ...formData, nextReminder: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          {/* Canales */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Canales de Envío <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {(['email', 'sms', 'whatsapp'] as const).map((channel) => (
                <label key={channel} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.channels.includes(channel)}
                    onChange={() => handleChannelToggle(channel)}
                    className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="text-gray-700">{CHANNEL_NAMES[channel]}</span>
                </label>
              ))}
            </div>
            {formData.channels.length === 0 && (
              <p className="text-sm text-red-500 mt-1">Selecciona al menos un canal</p>
            )}
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || formData.channels.length === 0}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creando...' : 'Crear Recordatorio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

