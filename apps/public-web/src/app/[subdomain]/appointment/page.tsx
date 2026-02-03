'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

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
  const vehicleIdFromUrl = searchParams.get('vehicle');
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    type: 'consultation',
    preferredDate: '',
    preferredTime: '',
    vehicleId: vehicleIdFromUrl || '',
    sellerId: '',
    notes: '',
  });
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchVehicles();
    fetchSellers();
  }, [subdomain]);

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
          ...formData,
        }),
      });

      if (response.ok) {
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

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold mb-2">¡Cita Solicitada!</h1>
          <p className="text-gray-600 mb-4">
            Hemos recibido tu solicitud de cita. Te contactaremos pronto para confirmar.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Recibirás una notificación por email y WhatsApp.
          </p>
          <Link
            href={`/${subdomain}`}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Volver al inicio →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-6">
          <Link
            href={`/${subdomain}`}
            className="text-primary-600 hover:text-primary-700 mb-4 inline-block"
          >
            ← Volver al inicio
          </Link>
          <h1 className="text-3xl font-bold mb-2">
            Solicitar Cita o Prueba de Manejo
          </h1>
          <p className="text-gray-600">
            Completa el formulario y selecciona el vendedor con quien deseas agendar
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
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

            {/* Tipo de Cita */}
            <div>
              <h2 className="text-xl font-bold mb-4">Tipo de Cita</h2>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full border rounded px-4 py-2"
                required
              >
                <option value="consultation">Consulta General</option>
                <option value="test_drive">Prueba de Manejo</option>
                <option value="delivery">Entrega de Vehículo</option>
                <option value="service">Servicio</option>
                <option value="financing">Financiamiento</option>
              </select>
            </div>

            {/* Vehículo de Interés */}
            <div>
              <label className="block text-sm font-medium mb-2">Vehículo de Interés (Opcional)</label>
              <select
                value={formData.vehicleId}
                onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                className="w-full border rounded px-4 py-2"
              >
                <option value="">Seleccionar vehículo</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.year} {vehicle.make} {vehicle.model} - {vehicle.currency} {vehicle.price.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha y Hora */}
            <div>
              <h2 className="text-xl font-bold mb-4">Fecha y Hora</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Fecha Preferida *</label>
                  <input
                    type="date"
                    value={formData.preferredDate}
                    onChange={(e) => {
                      setFormData({ ...formData, preferredDate: e.target.value, preferredTime: '' });
                    }}
                    className="w-full border rounded px-4 py-2"
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Hora Preferida *</label>
                  {loadingAvailability ? (
                    <div className="w-full border rounded px-4 py-2 bg-gray-100">
                      Cargando horarios disponibles...
                    </div>
                  ) : availableSlots.length > 0 ? (
                    <select
                      value={formData.preferredTime}
                      onChange={(e) => setFormData({ ...formData, preferredTime: e.target.value })}
                      className="w-full border rounded px-4 py-2"
                      required
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
                      required
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
              disabled={loading || (!!formData.sellerId && !formData.preferredTime)}
              className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Enviando...' : 'Solicitar Cita'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
