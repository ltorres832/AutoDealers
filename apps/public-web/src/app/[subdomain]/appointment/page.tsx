'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import PublicBackButton from '@/components/PublicBackButton';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase-config';

/** Debe coincidir con `PUBLIC_LEAD_APPOINTMENT_TRACKING_COLLECTION` en @autodealers/crm */
const PUBLIC_LEAD_APPOINTMENT_TRACKING_COLLECTION = 'publicLeadAppointmentTracking';

interface Seller {
  id: string;
  name: string;
  email: string;
  photo?: string;
  phone?: string;
  bio?: string;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  currency: string;
  photos: string[];
}

export default function AppointmentPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const subdomain = params.subdomain as string;
  const vehicleIdFromUrl = searchParams.get('vehicle') || searchParams.get('vehicleId') || '';
  const intentFromUrl =
    searchParams.get('intent') === 'test_drive_request' ? 'test_drive_request' : 'appointment';

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    type: intentFromUrl === 'test_drive_request' ? 'test_drive' : 'consultation',
    preferredDate: '',
    preferredTime: '',
    vehicleId: vehicleIdFromUrl,
    sellerId: '',
    notes: '',
    schedulingIntent: intentFromUrl as 'appointment' | 'test_drive_request',
    driverLicense: '',
  });
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [tracking, setTracking] = useState<{
    leadId: string;
    token: string;
    subdomain: string;
    tenantId?: string;
    hasAppointment: boolean;
  } | null>(null);
  const [clientNotification, setClientNotification] = useState<{
    headline?: string;
    body?: string;
    confirmedByName?: string;
  } | null>(null);

  useEffect(() => {
    fetchVehicles();
    fetchSellers();
  }, [subdomain]);

  const searchParamsKey = searchParams.toString();

  useEffect(() => {
    const v = searchParams.get('vehicle') || searchParams.get('vehicleId') || '';
    const intent =
      searchParams.get('intent') === 'test_drive_request' ? 'test_drive_request' : 'appointment';
    setFormData((prev) => ({
      ...prev,
      vehicleId: v || prev.vehicleId,
      schedulingIntent: intent,
      type:
        intent === 'test_drive_request'
          ? 'test_drive'
          : prev.type === 'test_drive'
            ? 'consultation'
            : prev.type,
    }));
  }, [searchParamsKey]);

  useEffect(() => {
    if (formData.sellerId && formData.preferredDate) {
      fetchAvailability();
    } else {
      setAvailableSlots([]);
    }
  }, [formData.sellerId, formData.preferredDate]);

  async function fetchVehicles() {
    try {
      const response = await fetch(`/api/tenant/${subdomain}`);
      const data = await response.json();
      setVehicles(data.vehicles || []);
    } catch (error) {
      console.error('Error:', error);
    }
  }

  async function fetchSellers() {
    try {
      const response = await fetch(`/api/sellers/${subdomain}`);
      const data = await response.json();
      setSellers(data.sellers || []);
    } catch (error) {
      console.error('Error fetching sellers:', error);
    }
  }

  async function fetchAvailability() {
    if (!formData.sellerId || !formData.preferredDate) return;

    setLoadingAvailability(true);
    try {
      const response = await fetch(
        `/api/appointments/availability/${subdomain}?sellerId=${formData.sellerId}&date=${formData.preferredDate}`
      );
      if (response.ok) {
        const data = await response.json();
        setAvailableSlots(data.availableSlots || []);
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoadingAvailability(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/appointments/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain,
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          type: formData.type,
          preferredDate: formData.preferredDate,
          preferredTime: formData.preferredTime,
          vehicleId: formData.vehicleId,
          sellerId: formData.sellerId,
          notes: formData.notes,
          intent: formData.schedulingIntent,
          driverLicense: formData.driverLicense.trim() || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTracking({
          leadId: data.leadId,
          token: data.trackingToken,
          subdomain: data.subdomain || subdomain,
          tenantId: data.tenantId,
          hasAppointment: Boolean(data.appointmentId),
        });
        setSubmitted(true);
      } else {
        const error = await response.json();
        alert(`Error al solicitar cita: ${error.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al solicitar cita');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!submitted || !tracking?.token) return;
    if (!db) {
      console.warn('Firestore no disponible; no hay escucha en tiempo real.');
      return;
    }

    const ref = doc(db, PUBLIC_LEAD_APPOINTMENT_TRACKING_COLLECTION, tracking.token);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.data();
        const n = data?.clientAppointmentNotification;
        if (n && typeof n === 'object') {
          setClientNotification({
            headline: typeof n.headline === 'string' ? n.headline : undefined,
            body: typeof n.body === 'string' ? n.body : undefined,
            confirmedByName: typeof n.confirmedByName === 'string' ? n.confirmedByName : undefined,
          });
        }
      },
      (err) => console.error('publicLeadAppointmentTracking listener:', err)
    );
    return () => unsub();
  }, [submitted, tracking?.token]);

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-10 px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold mb-2">
            {tracking?.hasAppointment ? '¡Cita solicitada!' : '¡Solicitud recibida!'}
          </h1>
          <p className="text-gray-600 mb-4">
            {tracking?.hasAppointment
              ? 'Hemos recibido tu solicitud. El vendedor recibirá un aviso al instante; cuando confirme, verás aquí el mensaje con su nombre.'
              : 'Registramos tu solicitud de prueba de manejo como lead. Un asesor te contactará para coordinar. Si confirman una cita más adelante, podrás ver avisos aquí también.'}
          </p>
          {clientNotification && (
            <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-left">
              <p className="text-sm font-semibold text-green-900">{clientNotification.headline}</p>
              <p className="text-sm text-green-800 mt-1">{clientNotification.body}</p>
              {clientNotification.confirmedByName && (
                <p className="text-xs text-green-700 mt-2">Confirmado por: {clientNotification.confirmedByName}</p>
              )}
            </div>
          )}
          {!clientNotification && tracking?.hasAppointment && (
            <p className="text-sm text-gray-500 mb-6">
              Esta página usa actualización en tiempo real; cuando el vendedor confirme, verás el mensaje aquí sin
              recargar.
            </p>
          )}
          {!clientNotification && !tracking?.hasAppointment && (
            <p className="text-sm text-gray-500 mb-6">
              Guarda esta página si quieres volver más tarde; cuando haya novedades sobre tu solicitud o una cita
              confirmada, podrás verlas aquí.
            </p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <PublicBackButton
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Volver
            </PublicBackButton>
            <span className="text-gray-300">|</span>
            <Link href={`/${subdomain}`} className="text-sm text-gray-500 hover:text-primary-600">
              Inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <PublicBackButton
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              ← Volver
            </PublicBackButton>
            <span className="text-gray-300">|</span>
            <Link href={`/${subdomain}`} className="text-sm text-gray-500 hover:text-primary-600">
              Inicio
            </Link>
          </div>
          <h1 className="text-3xl font-bold mb-2">
            {formData.schedulingIntent === 'test_drive_request'
              ? 'Solicitar prueba de manejo'
              : 'Agendar cita'}
          </h1>
          <p className="text-gray-600">
            Completa el formulario y elige un asesor. Puedes cambiar entre cita general y solicitud de prueba de manejo.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 p-2 bg-gray-50">
              <button
                type="button"
                onClick={() =>
                  setFormData((p) => ({
                    ...p,
                    schedulingIntent: 'appointment',
                    type: p.type === 'test_drive' && p.schedulingIntent === 'test_drive_request' ? 'consultation' : p.type,
                  }))
                }
                className={`flex-1 min-w-[140px] rounded-md px-4 py-2 text-sm font-medium transition ${
                  formData.schedulingIntent === 'appointment'
                    ? 'bg-primary-600 text-white shadow'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                📅 Agendar cita
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData((p) => ({
                    ...p,
                    schedulingIntent: 'test_drive_request',
                    type: 'test_drive',
                  }))
                }
                className={`flex-1 min-w-[140px] rounded-md px-4 py-2 text-sm font-medium transition ${
                  formData.schedulingIntent === 'test_drive_request'
                    ? 'bg-primary-600 text-white shadow'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                🚗 Prueba de manejo
              </button>
            </div>

            {/* Información Personal */}
            <div>
              <h2 className="text-xl font-bold mb-4">Información Personal</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nombre Completo *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border rounded px-4 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Teléfono *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full border rounded px-4 py-2"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border rounded px-4 py-2"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Selección de Vendedor */}
            {sellers.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-4">Selecciona un Vendedor</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sellers.map((seller) => (
                    <div
                      key={seller.id}
                      onClick={() => setFormData({ ...formData, sellerId: seller.id })}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                        formData.sellerId === seller.id
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-gray-200 hover:border-primary-300'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {seller.photo ? (
                          <img
                            src={seller.photo}
                            alt={seller.name}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center text-2xl">
                            {seller.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{seller.name}</h3>
                          {seller.bio && (
                            <p className="text-sm text-gray-600 mt-1">{seller.bio}</p>
                          )}
                        </div>
                        {formData.sellerId === seller.id && (
                          <div className="text-primary-600 text-xl">✓</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {formData.sellerId && (
                  <p className="text-sm text-gray-600 mt-2">
                    Has seleccionado a {sellers.find((s) => s.id === formData.sellerId)?.name}
                  </p>
                )}
              </div>
            )}

            {/* Tipo de Cita (solo flujo “cita”) */}
            {formData.schedulingIntent === 'appointment' && (
              <div>
                <h2 className="text-xl font-bold mb-4">Tipo de cita</h2>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full border rounded px-4 py-2"
                  required
                >
                  <option value="consultation">Consulta general</option>
                  <option value="test_drive">Prueba de manejo</option>
                  <option value="delivery">Entrega de vehículo</option>
                </select>
              </div>
            )}

            {formData.schedulingIntent === 'test_drive_request' && (
              <div>
                <h2 className="text-xl font-bold mb-4">Prueba de manejo</h2>
                <p className="text-sm text-gray-600 mb-3">
                  Se registrará como solicitud vinculada al vehículo. Si indicas fecha y hora preferidas y hay
                  disponibilidad, también se agendará la cita en el calendario del asesor.
                </p>
                <label className="block text-sm font-medium mb-2">Licencia de conducir (opcional)</label>
                <input
                  type="text"
                  value={formData.driverLicense}
                  onChange={(e) => setFormData({ ...formData, driverLicense: e.target.value })}
                  className="w-full border rounded px-4 py-2"
                  placeholder="Número o referencia"
                />
              </div>
            )}

            {/* Vehículo de Interés */}
            <div>
              <label className="block text-sm font-medium mb-2">Vehículo de Interés (Opcional)</label>
              <select
                value={formData.vehicleId}
                onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                className="w-full border rounded px-4 py-2"
              >
                <option value="">Seleccionar vehículo</option>
                {vehicles.map((vehicle) => {
                  const stk = (vehicle as { stockNumber?: string }).stockNumber;
                  return (
                    <option key={vehicle.id} value={vehicle.id}>
                      {stk ? `[${stk}] ` : ''}
                      {vehicle.year} {vehicle.make} {vehicle.model} — {vehicle.currency}{' '}
                      {vehicle.price.toLocaleString()}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Fecha y Hora */}
            <div>
              <h2 className="text-xl font-bold mb-4">
                {formData.schedulingIntent === 'test_drive_request'
                  ? 'Preferencia de fecha y hora (opcional)'
                  : 'Fecha y hora'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Fecha {formData.schedulingIntent === 'appointment' ? 'preferida *' : 'preferida'}
                  </label>
                  <input
                    type="date"
                    value={formData.preferredDate}
                    onChange={(e) => {
                      setFormData({ ...formData, preferredDate: e.target.value, preferredTime: '' });
                    }}
                    className="w-full border rounded px-4 py-2"
                    min={new Date().toISOString().split('T')[0]}
                    required={formData.schedulingIntent === 'appointment'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Hora {formData.schedulingIntent === 'appointment' ? 'preferida *' : 'preferida'}
                  </label>
                  {loadingAvailability ? (
                    <div className="w-full border rounded px-4 py-2 bg-gray-100">
                      Cargando horarios disponibles...
                    </div>
                  ) : availableSlots.length > 0 ? (
                    <select
                      value={formData.preferredTime}
                      onChange={(e) => setFormData({ ...formData, preferredTime: e.target.value })}
                      className="w-full border rounded px-4 py-2"
                      required={formData.schedulingIntent === 'appointment'}
                    >
                      <option value="">Seleccionar hora</option>
                      {availableSlots.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  ) : formData.sellerId && formData.preferredDate ? (
                    <div className="w-full border rounded px-4 py-2 bg-yellow-50 text-yellow-800">
                      No hay horarios disponibles para esta fecha. Por favor selecciona otra fecha.
                    </div>
                  ) : (
                    <input
                      type="time"
                      value={formData.preferredTime}
                      onChange={(e) => setFormData({ ...formData, preferredTime: e.target.value })}
                      className="w-full border rounded px-4 py-2"
                      required={formData.schedulingIntent === 'appointment'}
                    />
                  )}
                </div>
              </div>
              {formData.sellerId && formData.preferredDate && availableSlots.length > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  {availableSlots.length} horarios disponibles para esta fecha
                </p>
              )}
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium mb-2">Notas Adicionales</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full border rounded px-4 py-2"
                rows={4}
                placeholder="Comentarios adicionales, preguntas, etc..."
              />
            </div>

            <button
              type="submit"
              disabled={
                loading ||
                !formData.sellerId ||
                (formData.schedulingIntent === 'appointment' &&
                  (!formData.preferredDate || !formData.preferredTime)) ||
                (formData.schedulingIntent === 'test_drive_request' &&
                  ((!!formData.preferredDate && !formData.preferredTime) ||
                    (!formData.preferredDate && !!formData.preferredTime)))
              }
              className={`w-full px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed text-white ${
                formData.schedulingIntent === 'test_drive_request'
                  ? 'bg-primary-600 hover:bg-primary-700'
                  : 'bg-primary-600 hover:bg-primary-700'
              }`}
            >
              {loading
                ? 'Enviando...'
                : formData.schedulingIntent === 'test_drive_request'
                  ? 'Enviar solicitud de prueba'
                  : 'Solicitar cita'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
