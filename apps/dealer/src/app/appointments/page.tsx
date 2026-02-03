'use client';

import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useRealtimeAppointments } from '@/hooks/useRealtimeAppointments';
import { useAuth } from '@/hooks/useAuth';

interface Appointment {
  id: string;
  leadId: string;
  assignedTo: string;
  vehicleIds: string[];
  type: string;
  scheduledAt: string | Date;
  duration: number;
  status: string;
}

export default function AppointmentsPage() {
  const { user } = useAuth();
  const { appointments: realtimeAppointments, loading } = useRealtimeAppointments({
    tenantId: user?.tenantId,
  });
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Convertir appointments de tiempo real al formato esperado
  const appointments: Appointment[] = realtimeAppointments.map((apt: any) => ({
    ...apt,
    scheduledAt: apt.scheduledAt instanceof Date ? apt.scheduledAt : new Date(apt.scheduledAt),
    assignedTo: apt.assignedTo || apt.assignedTo || '',
    vehicleIds: apt.vehicleIds || [],
  }));

  const calendarEvents = appointments.map((apt) => {
    const scheduledAt = apt.scheduledAt instanceof Date 
      ? apt.scheduledAt 
      : new Date(apt.scheduledAt);
    return {
      id: apt.id,
      title: `${apt.type} - ${apt.leadId}`,
      start: scheduledAt.toISOString(),
      end: new Date(
        scheduledAt.getTime() + apt.duration * 60 * 1000
      ).toISOString(),
      backgroundColor:
        apt.status === 'confirmed'
          ? '#10B981'
          : apt.status === 'completed'
          ? '#6B7280'
          : '#3B82F6',
    };
  });

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
        <h1 className="text-3xl font-bold">Citas</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700"
        >
          Nueva Cita
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          events={calendarEvents}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          height="auto"
          locale="es"
        />
      </div>

      {showCreateModal && (
        <CreateAppointmentModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}

function CreateAppointmentModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    leadId: '',
    assignedTo: '',
    vehicleIds: [] as string[],
    type: 'test_drive',
    scheduledAt: '',
    duration: 60,
    notes: '',
  });
  const [leads, setLeads] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const { fetchWithAuth } = await import('@/lib/fetch-with-auth');
      const [leadsRes, vehiclesRes, sellersRes] = await Promise.all([
        fetchWithAuth('/api/leads', {}),
        fetchWithAuth('/api/vehicles', {}),
        fetchWithAuth('/api/sellers', {}),
      ]);

      if (leadsRes.ok) {
        const leadsData = await leadsRes.json();
        setLeads(leadsData.leads || []);
      }

      if (vehiclesRes.ok) {
        const vehiclesData = await vehiclesRes.json();
        setVehicles(vehiclesData.vehicles || []);
      }

      if (sellersRes.ok) {
        const sellersData = await sellersRes.json();
        setSellers(sellersData.sellers || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { fetchWithAuth } = await import('@/lib/fetch-with-auth');
      const response = await fetchWithAuth('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          scheduledAt: new Date(formData.scheduledAt).toISOString(),
        }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al crear cita');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear cita');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">Nueva Cita</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Lead/Cliente *</label>
            <select
              value={formData.leadId}
              onChange={(e) => setFormData({ ...formData, leadId: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
            >
              <option value="">Seleccionar lead...</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.contact?.name || lead.contact?.email || lead.id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Asignado a *</label>
            <select
              value={formData.assignedTo}
              onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
            >
              <option value="">Seleccionar vendedor...</option>
              {sellers.map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Tipo de Cita *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
            >
              <option value="test_drive">Prueba de Manejo</option>
              <option value="inspection">Inspección</option>
              <option value="consultation">Consulta</option>
              <option value="delivery">Entrega</option>
              <option value="other">Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Vehículo(s)</label>
            <select
              multiple
              value={formData.vehicleIds}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                setFormData({ ...formData, vehicleIds: selected });
              }}
              className="w-full border rounded px-3 py-2"
            >
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.make} {vehicle.model} {vehicle.year}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Mantén presionado Ctrl/Cmd para seleccionar múltiples</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Fecha y Hora *</label>
              <input
                type="datetime-local"
                value={formData.scheduledAt}
                onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Duración (minutos) *</label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                className="w-full border rounded px-3 py-2"
                min="15"
                step="15"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Notas</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full border rounded px-3 py-2"
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              {loading ? 'Creando...' : 'Crear Cita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



