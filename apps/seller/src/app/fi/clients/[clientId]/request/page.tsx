'use client';

// Página para crear una solicitud F&I para un cliente

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface FIClient {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehiclePrice?: number;
  downPayment?: number;
}

export default function CreateFIRequestPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.clientId as string;

  const [client, setClient] = useState<FIClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    // Información financiera
    employer: '',
    position: '',
    monthlyIncome: '',
    timeAtJob: '',
    incomeType: 'salary' as 'salary' | 'self_employed' | 'business' | 'retirement' | 'other',
    creditRange: 'good' as 'excellent' | 'good' | 'fair' | 'poor' | 'very_poor',
    creditNotes: '',
    // Información personal
    maritalStatus: 'single' as 'single' | 'married' | 'divorced' | 'widowed',
    dependents: '0',
    housing: 'rent' as 'rent' | 'own' | 'family',
    monthlyHousingPayment: '',
    // Notas
    sellerNotes: '',
  });

  useEffect(() => {
    fetchClient();
  }, [clientId]);

  const fetchClient = async () => {
    try {
      const response = await fetch('/api/fi/clients');
      if (response.ok) {
        const data = await response.json();
        const foundClient = data.clients.find((c: FIClient) => c.id === clientId);
        if (foundClient) {
          setClient(foundClient);
        } else {
          router.push('/fi');
        }
      }
    } catch (error) {
      console.error('Error fetching client:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, submitToFI: boolean = false) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/fi/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          employment: {
            employer: formData.employer || undefined,
            position: formData.position || undefined,
            monthlyIncome: parseFloat(formData.monthlyIncome) || 0,
            timeAtJob: parseInt(formData.timeAtJob) || 0,
            incomeType: formData.incomeType,
          },
          creditInfo: {
            creditRange: formData.creditRange,
            notes: formData.creditNotes || undefined,
          },
          personalInfo: {
            maritalStatus: formData.maritalStatus,
            dependents: parseInt(formData.dependents) || 0,
            housing: formData.housing,
            monthlyHousingPayment: formData.monthlyHousingPayment ? parseFloat(formData.monthlyHousingPayment) : undefined,
          },
          sellerNotes: formData.sellerNotes || undefined,
          submit: submitToFI,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/fi/requests/${data.request.id}`);
      } else {
        const error = await response.json();
        alert(error.error || 'Error al crear solicitud F&I');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear solicitud F&I');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Cliente no encontrado</p>
        <Link href="/fi" className="text-blue-600 hover:text-blue-700 mt-4 inline-block">
          Volver a F&I
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href="/fi" className="text-blue-600 hover:text-blue-700 text-sm">
          ← Volver a F&I
        </Link>
      </div>

      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="font-semibold text-blue-900 mb-1">Cliente: {client.name}</h2>
        <p className="text-sm text-blue-700">{client.phone}</p>
        {client.vehicleMake && (
          <p className="text-sm text-blue-700 mt-1">
            Vehículo: {client.vehicleYear} {client.vehicleMake} {client.vehicleModel}
            {client.vehiclePrice && ` - $${client.vehiclePrice.toLocaleString()}`}
          </p>
        )}
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Nueva Solicitud F&I</h1>
      <p className="text-gray-600 mb-8">
        Completa la información financiera del cliente
      </p>

      <form onSubmit={(e) => handleSubmit(e, false)} className="bg-white shadow rounded-lg p-6">
        {/* Información Financiera */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Información Financiera</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Empleador
              </label>
              <input
                type="text"
                value={formData.employer}
                onChange={(e) => setFormData({ ...formData, employer: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Posición/Cargo
              </label>
              <input
                type="text"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ingreso Mensual *
              </label>
              <input
                type="number"
                required
                step="0.01"
                value={formData.monthlyIncome}
                onChange={(e) => setFormData({ ...formData, monthlyIncome: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tiempo en Empleo (meses) *
              </label>
              <input
                type="number"
                required
                value={formData.timeAtJob}
                onChange={(e) => setFormData({ ...formData, timeAtJob: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Ingreso *
              </label>
              <select
                required
                value={formData.incomeType}
                onChange={(e) => setFormData({ ...formData, incomeType: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="salary">Salario</option>
                <option value="self_employed">Trabajador Independiente</option>
                <option value="business">Negocio Propio</option>
                <option value="retirement">Jubilación</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Crédito Aproximado *
              </label>
              <select
                required
                value={formData.creditRange}
                onChange={(e) => setFormData({ ...formData, creditRange: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="excellent">Excelente (750+)</option>
                <option value="good">Bueno (700-749)</option>
                <option value="fair">Regular (650-699)</option>
                <option value="poor">Bajo (600-649)</option>
                <option value="very_poor">Muy Bajo (&lt;600)</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas sobre Crédito
              </label>
              <textarea
                value={formData.creditNotes}
                onChange={(e) => setFormData({ ...formData, creditNotes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Información Personal */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Información Personal</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado Civil *
              </label>
              <select
                required
                value={formData.maritalStatus}
                onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="single">Soltero</option>
                <option value="married">Casado</option>
                <option value="divorced">Divorciado</option>
                <option value="widowed">Viudo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dependientes *
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.dependents}
                onChange={(e) => setFormData({ ...formData, dependents: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vivienda *
              </label>
              <select
                required
                value={formData.housing}
                onChange={(e) => setFormData({ ...formData, housing: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="rent">Rentada</option>
                <option value="own">Propia</option>
                <option value="family">Familiar</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pago Mensual de Vivienda
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.monthlyHousingPayment}
                onChange={(e) => setFormData({ ...formData, monthlyHousingPayment: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Notas del Vendedor */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Notas del Vendedor</h2>
          <textarea
            value={formData.sellerNotes}
            onChange={(e) => setFormData({ ...formData, sellerNotes: e.target.value })}
            rows={4}
            placeholder="Agrega cualquier información adicional relevante..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-4">
          <Link
            href="/fi"
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
          >
            {submitting ? 'Guardando...' : 'Guardar Borrador'}
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Enviando...' : 'Enviar a F&I'}
          </button>
        </div>
      </form>
    </div>
  );
}

