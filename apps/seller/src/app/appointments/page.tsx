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
  type: string;
  scheduledAt: string | Date;
  duration: number;
  status: string;
  vehicleIds?: string[];
  location?: string;
  notes?: string;
}

interface Lead {
  id: string;
  contact: {
    name: string;
    phone: string;
    email?: string;
  };
}

export default function AppointmentsPage() {
  const { user } = useAuth();
  const { appointments: realtimeAppointments, loading } = useRealtimeAppointments({
    tenantId: user?.tenantId,
    assignedTo: user?.userId,
  });
  const [leads, setLeads] = useState<Record<string, Lead>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Convertir appointments de tiempo real al formato esperado
  const appointments: Appointment[] = realtimeAppointments.map((apt) => {
    let scheduledAtDate: Date;
    if (apt.scheduledAt instanceof Date) {
      scheduledAtDate = apt.scheduledAt;
    } else if (apt.scheduledAt && typeof apt.scheduledAt === 'object' && 'toDate' in apt.scheduledAt) {
      // Es un Timestamp de Firestore
      scheduledAtDate = (apt.scheduledAt as any).toDate();
    } else {
      scheduledAtDate = new Date(apt.scheduledAt as string | number);
    }
    return {
      ...apt,
      scheduledAt: scheduledAtDate,
    };
  });

  useEffect(() => {
    // Obtener información de leads para las citas
    const leadIds = [...new Set(appointments.map(apt => apt.leadId).filter(Boolean))];
    if (leadIds.length > 0) {
      fetchLeads(leadIds);
    }
  }, [appointments]);

  async function fetchLeads(leadIds: string[]) {
    if (!user?.tenantId) return;

    try {
      const { fetchWithAuth } = await import('@/lib/fetch-with-auth');
      const response = await fetchWithAuth(`/api/leads?ids=${leadIds.join(',')}`, {});
      if (response.ok) {
        const data = await response.json();
        const leadsMap: Record<string, Lead> = {};
        data.leads?.forEach((lead: Lead) => {
          leadsMap[lead.id] = lead;
        });
        setLeads((prev) => ({ ...prev, ...leadsMap }));
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  }

  const calendarEvents = appointments.map((apt) => {
    const lead = leads[apt.leadId];
    const leadName = lead?.contact?.name || 'Cliente';
    
    return {
      id: apt.id,
      title: `${leadName} - ${apt.type === 'test_drive' ? 'Prueba' : apt.type === 'consultation' ? 'Consulta' : apt.type}`,
      start: apt.scheduledAt instanceof Date ? apt.scheduledAt.toISOString() : apt.scheduledAt,
      end: new Date(
        new Date(apt.scheduledAt instanceof Date ? apt.scheduledAt : new Date(apt.scheduledAt)).getTime() + apt.duration * 60 * 1000
      ).toISOString(),
      backgroundColor:
        apt.status === 'confirmed'
          ? '#10B981'
          : apt.status === 'completed'
          ? '#6B7280'
          : apt.status === 'cancelled'
          ? '#EF4444'
          : '#3B82F6',
      extendedProps: {
        appointment: apt,
        lead: lead,
      },
    };
  });

  function handleEventClick(info: any) {
    setSelectedAppointment(info.event.extendedProps.appointment);
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
          <h1 className="text-3xl font-bold">Mis Citas</h1>
          <p className="text-gray-600 mt-1">
            Sincronizado en tiempo real - {appointments.length} citas
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700"
        >
          Nueva Cita
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
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
          eventClick={handleEventClick}
          eventDisplay="block"
        />
      </div>

      {/* Lista de Citas */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Próximas Citas</h2>
        </div>
        <div className="divide-y">
          {appointments
            .filter((apt) => {
              const aptDate = apt.scheduledAt instanceof Date ? apt.scheduledAt : new Date(apt.scheduledAt);
              return aptDate >= new Date() && apt.status !== 'completed' && apt.status !== 'cancelled';
            })
            .slice(0, 10)
            .map((apt) => {
              const lead = leads[apt.leadId];
              const aptDate = apt.scheduledAt instanceof Date ? apt.scheduledAt : new Date(apt.scheduledAt);
              
              return (
                <div
                  key={apt.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedAppointment(apt)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">
                        {lead?.contact?.name || 'Cliente'} - {apt.type === 'test_drive' ? 'Prueba de Manejo' : apt.type === 'consultation' ? 'Consulta' : apt.type}
                      </h3>
                      <p className="text-sm text-gray-600">
                        📅 {aptDate.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                      <p className="text-sm text-gray-600">
                        🕐 {aptDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - Duración: {apt.duration} min
                      </p>
                      {lead?.contact?.phone && (
                        <p className="text-sm text-gray-600">📞 {lead.contact.phone}</p>
                      )}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        apt.status === 'confirmed'
                          ? 'bg-green-100 text-green-700'
                          : apt.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : apt.status === 'cancelled'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {apt.status === 'confirmed' ? 'Confirmada' : apt.status === 'pending' ? 'Pendiente' : apt.status === 'cancelled' ? 'Cancelada' : apt.status}
                    </span>
                  </div>
                </div>
              );
            })}
          {appointments.filter((apt) => {
            const aptDate = apt.scheduledAt instanceof Date ? apt.scheduledAt : new Date(apt.scheduledAt);
            return aptDate >= new Date() && apt.status !== 'completed' && apt.status !== 'cancelled';
          }).length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No hay citas próximas
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateAppointmentModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            // La suscripción en tiempo real actualizará automáticamente
          }}
        />
      )}

      {selectedAppointment && (
        <AppointmentDetailModal
          appointment={selectedAppointment}
          lead={leads[selectedAppointment.leadId]}
          onClose={() => setSelectedAppointment(null)}
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
    type: 'consultation',
    scheduledAt: '',
    duration: 30,
    vehicleIds: [] as string[],
    location: '',
    notes: '',
  });
  const [leads, setLeads] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLeads();
    fetchVehicles();
  }, []);

  async function fetchLeads() {
    try {
      const { fetchWithAuth } = await import('@/lib/fetch-with-auth');
      const response = await fetchWithAuth('/api/leads', {});
      if (response.ok) {
        const data = await response.json();
        setLeads(data.leads || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  async function fetchVehicles() {
    try {
      const { fetchWithAuth } = await import('@/lib/fetch-with-auth');
      const response = await fetchWithAuth('/api/inventory', {});
      if (response.ok) {
        const data = await response.json();
        setVehicles(data.vehicles || []);
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
        body: JSON.stringify(formData),
      });

      if (response.ok) {
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold">Nueva Cita</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
            ×
          </button>
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
              <option value="">Seleccionar lead</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.contact?.name} - {lead.contact?.phone}
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
              <option value="consultation">Consulta</option>
              <option value="test_drive">Prueba de Manejo</option>
              <option value="delivery">Entrega</option>
              <option value="service">Servicio</option>
              <option value="financing">Financiamiento</option>
            </select>
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
            <label className="block text-sm font-medium mb-2">Vehículo(s) (Opcional)</label>
            <select
              multiple
              value={formData.vehicleIds}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                setFormData({ ...formData, vehicleIds: selected });
              }}
              className="w-full border rounded px-3 py-2"
            >
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Ubicación</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="Ej: Oficina principal, Showroom, etc."
            />
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

function AppointmentDetailModal({
  appointment,
  lead,
  onClose,
}: {
  appointment: Appointment;
  lead?: Lead;
  onClose: () => void;
}) {
  const aptDate = appointment.scheduledAt instanceof Date ? appointment.scheduledAt : new Date(appointment.scheduledAt);
  const endTime = new Date(aptDate.getTime() + appointment.duration * 60 * 1000);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold">Detalles de la Cita</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
            ×
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Cliente</h3>
            <p className="text-gray-700">
              {lead?.contact?.name || 'N/A'}
            </p>
            {lead?.contact?.phone && (
              <p className="text-sm text-gray-600">📞 {lead.contact.phone}</p>
            )}
            {lead?.contact?.email && (
              <p className="text-sm text-gray-600">✉️ {lead.contact.email}</p>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Tipo</h3>
            <p className="text-gray-700 capitalize">
              {appointment.type === 'test_drive' ? 'Prueba de Manejo' : appointment.type === 'consultation' ? 'Consulta' : appointment.type}
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Fecha y Hora</h3>
            <p className="text-gray-700">
              📅 {aptDate.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p className="text-gray-700">
              🕐 {aptDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - {endTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-sm text-gray-600">Duración: {appointment.duration} minutos</p>
          </div>
          {appointment.location && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Ubicación</h3>
              <p className="text-gray-700">📍 {appointment.location}</p>
            </div>
          )}
          {appointment.notes && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Notas</h3>
              <p className="text-gray-700">{appointment.notes}</p>
            </div>
          )}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Estado</h3>
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                appointment.status === 'confirmed'
                  ? 'bg-green-100 text-green-700'
                  : appointment.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-700'
                  : appointment.status === 'cancelled'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {appointment.status === 'confirmed' ? 'Confirmada' : appointment.status === 'pending' ? 'Pendiente' : appointment.status === 'cancelled' ? 'Cancelada' : appointment.status}
            </span>
          </div>
        </div>
        <div className="p-6 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
