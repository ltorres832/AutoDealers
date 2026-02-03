'use client';

import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeAppointments } from '@/hooks/useRealtimeAppointments';

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
  const { auth } = useAuth();
  const { appointments: realtimeAppointments, loading } = useRealtimeAppointments({
    tenantId: auth?.tenantId,
  });
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Convertir appointments de tiempo real al formato esperado
  const appointments: Appointment[] = realtimeAppointments.map((apt: any) => ({
    ...apt,
    scheduledAt: apt.scheduledAt instanceof Date ? apt.scheduledAt.toISOString() : apt.scheduledAt,
  })) as Appointment[];

  const calendarEvents = appointments.map((apt) => ({
    id: apt.id,
    title: `${apt.type} - ${apt.leadId}`,
    start: apt.scheduledAt,
    end: new Date(
      new Date(apt.scheduledAt).getTime() + apt.duration * 60 * 1000
    ).toISOString(),
    backgroundColor:
      apt.status === 'confirmed'
        ? '#10B981'
        : apt.status === 'completed'
        ? '#6B7280'
        : '#3B82F6',
  }));

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
          onSuccess={() => {}}
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
    type: 'consultation',
    scheduledAt: '',
    duration: 60,
    location: '',
  });
  const [leads, setLeads] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLeads();
    fetchVehicles();
  }, []);

  async function fetchLeads() {
    const response = await fetch('/api/leads');
    const data = await response.json();
    setLeads(data.leads || []);
  }

  async function fetchVehicles() {
    const response = await fetch('/api/vehicles?status=available');
    const data = await response.json();
    setVehicles(data.vehicles || []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onClose();
        onSuccess();
      } else {
        alert('Error al crear cita');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear cita');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Nueva Cita</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Lead</label>
            <select
              value={formData.leadId}
              onChange={(e) =>
                setFormData({ ...formData, leadId: e.target.value })
              }
              className="w-full border rounded px-3 py-2"
              required
            >
              <option value="">Seleccionar lead</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.contact.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Tipo</label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value })
              }
              className="w-full border rounded px-3 py-2"
            >
              <option value="consultation">Consulta</option>
              <option value="test_drive">Prueba de Manejo</option>
              <option value="delivery">Entrega</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Fecha y Hora
            </label>
            <input
              type="datetime-local"
              value={formData.scheduledAt}
              onChange={(e) =>
                setFormData({ ...formData, scheduledAt: e.target.value })
              }
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Duración (minutos)
            </label>
            <input
              type="number"
              value={formData.duration}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  duration: parseInt(e.target.value),
                })
              }
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Vehículos</label>
            <select
              multiple
              value={formData.vehicleIds}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  vehicleIds: Array.from(e.target.selectedOptions, (o) =>
                    o.value
                  ),
                })
              }
              className="w-full border rounded px-3 py-2"
            >
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 justify-end">
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
              {loading ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}





