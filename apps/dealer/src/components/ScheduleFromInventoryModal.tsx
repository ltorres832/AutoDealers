'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

export type ScheduleVehicle = {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  currency: string;
  stockNumber?: string;
  specifications?: { stockNumber?: string };
};

export type ScheduleFromInventoryMode = 'appointment' | 'test_drive_request';

export default function ScheduleFromInventoryModal({
  vehicle,
  mode = 'appointment',
  onClose,
  onSuccess,
}: {
  vehicle: ScheduleVehicle;
  mode?: ScheduleFromInventoryMode;
  onClose: () => void;
  onSuccess?: (payload?: { leadId: string }) => void;
}) {
  const [sellers, setSellers] = useState<{ id: string; name: string }[]>([]);
  const [contact, setContact] = useState({ name: '', phone: '', email: '' });
  const [assignedTo, setAssignedTo] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [type, setType] = useState('test_drive');
  const [notes, setNotes] = useState('');
  const [driverLicense, setDriverLicense] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ leadId?: string; hasAppointment?: boolean } | null>(null);

  useEffect(() => {
    fetchWithAuth('/api/sellers', {})
      .then((r) => r.json())
      .then((d) => {
        const list = (d.sellers || []).map((s: { id: string; name?: string; email?: string }) => ({
          id: s.id,
          name: s.name || s.email || s.id,
        }));
        setSellers(list);
        if (list.length === 1) setAssignedTo(list[0].id);
      })
      .catch(() => setSellers([]));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!assignedTo) {
      alert('Selecciona un vendedor');
      return;
    }
    if (mode === 'appointment' && !scheduledAt) {
      alert('Indica fecha y hora de la cita');
      return;
    }
    setLoading(true);
    try {
      const intent = mode === 'test_drive_request' ? 'test_drive_request' : 'appointment';
      const res = await fetchWithAuth('/api/inventory/schedule-appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent,
          vehicleId: vehicle.id,
          contact,
          scheduledAt: scheduledAt || undefined,
          type: mode === 'appointment' ? type : 'test_drive',
          assignedTo,
          notes: notes || undefined,
          driverLicense: mode === 'test_drive_request' && driverLicense.trim() ? driverLicense.trim() : undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error || 'Error');
      }
      const data = (await res.json().catch(() => ({}))) as {
        lead?: { id?: string };
        appointment?: { id?: string } | null;
      };
      const id = typeof data.lead?.id === 'string' && data.lead.id.trim() ? data.lead.id.trim() : undefined;
      const hasAppointment = Boolean(data.appointment);
      setSuccess(id ? { leadId: id, hasAppointment } : { hasAppointment });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  const stock = vehicle.stockNumber || vehicle.specifications?.stockNumber || '';

  function handleDoneClose() {
    if (success?.leadId) {
      onSuccess?.({ leadId: success.leadId });
    } else {
      onSuccess?.();
    }
    onClose();
  }

  const isTestDrive = mode === 'test_drive_request';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-2">
          {isTestDrive ? 'Solicitar prueba de manejo' : 'Crear cita (cliente)'}
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          {vehicle.year} {vehicle.make} {vehicle.model}
          {stock ? ` · Stock #${stock}` : ''}
        </p>

        {success !== null ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900 text-sm">
              <p className="font-semibold">
                {success.hasAppointment ? 'Lead y cita registrados correctamente.' : 'Lead registrado correctamente.'}
              </p>
              <p className="mt-1 text-emerald-800">
                {isTestDrive
                  ? success.hasAppointment
                    ? 'La solicitud de prueba quedó como lead con cita en el calendario. El vendedor y la gerencia reciben notificación (sistema, email y otros canales según configuración).'
                    : 'Quedó un lead de solicitud de prueba de manejo (sin cita en calendario). Coordina fecha con el cliente; el vendedor y la gerencia fueron notificados.'
                  : 'El cliente quedó como lead con cita en el calendario. Vendedor y gerencia reciben avisos según su configuración.'}
              </p>
            </div>
            {success.leadId ? (
              <Link
                href={`/leads/${success.leadId}`}
                className="inline-flex items-center justify-center w-full rounded-lg bg-primary-600 px-4 py-3 text-sm font-medium text-white hover:bg-primary-700"
              >
                Abrir ficha del lead en CRM →
              </Link>
            ) : (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                No se recibió el ID del lead en la respuesta; revisa el listado de leads o citas.
              </p>
            )}
            {success.hasAppointment ? (
              <Link
                href="/appointments"
                className="inline-flex items-center justify-center w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                Ir al calendario de citas →
              </Link>
            ) : null}
            <button
              type="button"
              onClick={handleDoneClose}
              className="w-full border border-gray-300 py-2 rounded hover:bg-gray-50 text-sm"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendedor *</label>
              <select
                required
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Seleccionar…</option>
                {sellers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente — nombre *</label>
                <input
                  required
                  value={contact.name}
                  onChange={(e) => setContact({ ...contact, name: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
                <input
                  required
                  type="tel"
                  value={contact.phone}
                  onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={contact.email}
                onChange={(e) => setContact({ ...contact, email: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isTestDrive ? 'Preferencia de fecha y hora (opcional)' : 'Fecha y hora *'}
              </label>
              <input
                type="datetime-local"
                required={!isTestDrive}
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
              {isTestDrive ? (
                <p className="text-xs text-gray-500 mt-1">
                  Si la dejas vacía solo se crea el lead de solicitud; si indicas fecha, también se agenda la cita tipo
                  prueba de manejo.
                </p>
              ) : null}
            </div>
            {!isTestDrive ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de cita *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="consultation">Consulta</option>
                  <option value="test_drive">Prueba de manejo</option>
                  <option value="delivery">Entrega</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Licencia de conducir (opcional)</label>
                <input
                  value={driverLicense}
                  onChange={(e) => setDriverLicense(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Número o referencia"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-gray-300 py-2 rounded hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-primary-600 text-white py-2 rounded hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Guardando…' : isTestDrive ? 'Registrar solicitud' : 'Crear lead y cita'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
