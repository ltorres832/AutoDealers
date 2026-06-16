'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import FIExtendedRequestForm, {
  buildRequestPayloadFromForm,
  emptyEmploymentRow,
  emptyReference,
  type FIExtendedRequestFormData,
} from '@/components/FIExtendedRequestForm';
import { buildCosignerPayload, emptyCosignerFormInput } from '@autodealers/core/fi-cosigner-payload';
import { isValidSsn } from '@autodealers/core/fi-ssn';

interface FIClient {
  id: string;
  name: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  yearsAtAddress?: number;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehiclePrice?: number;
  downPayment?: number;
}

const initialFormData = (): FIExtendedRequestFormData => ({
  primary: emptyEmploymentRow(),
  additionalJobs: [],
  previousJob: emptyEmploymentRow(),
  hasPreviousJob: false,
  otherIncome: [],
  references: [emptyReference(), emptyReference()],
  spouseName: '',
  spousePhone: '',
  spouseEmployer: '',
  spousePosition: '',
  spouseEmployerPhone: '',
  spouseMonthlyIncome: '',
  monthlyDebtPayments: '',
  bankruptcyHistory: false,
  bankruptcyNotes: '',
  yearsAtAddress: '',
  dateOfBirth: '',
  creditRange: 'good',
  creditNotes: '',
  maritalStatus: 'single',
  dependents: '0',
  housing: 'rent',
  monthlyHousingPayment: '',
  sellerNotes: '',
  hasCosigner: false,
  cosigner: emptyCosignerFormInput(),
});

export default function CreateFIRequestPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.clientId as string;

  const [customerFileIdFromUrl, setCustomerFileIdFromUrl] = useState('');
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search).get('customerFileId')?.trim() || '';
    setCustomerFileIdFromUrl(q);
  }, [clientId]);

  const [client, setClient] = useState<FIClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FIExtendedRequestFormData>(initialFormData);

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
          setFormData((prev) => ({
            ...prev,
            dateOfBirth: foundClient.dateOfBirth || prev.dateOfBirth,
            yearsAtAddress:
              foundClient.yearsAtAddress != null
                ? String(foundClient.yearsAtAddress)
                : prev.yearsAtAddress,
          }));
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
      const payload = buildRequestPayloadFromForm(formData);
      let cosignerData;
      if (formData.hasCosigner && formData.cosigner.name.trim()) {
        if (!isValidSsn(formData.cosigner.ssn)) {
          alert('Ingrese el SSN completo del codeudor (XXX-XX-XXXX).');
          setSubmitting(false);
          return;
        }
        cosignerData = buildCosignerPayload(formData.cosigner);
      }
      const response = await fetch('/api/fi/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          ...payload,
          ...(cosignerData ? { cosignerData } : {}),
          submit: submitToFI,
          ...(customerFileIdFromUrl ? { customerFileId: customerFileIdFromUrl } : {}),
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
        <Link href="/fi" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
          Volver a F&I
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href="/fi" className="text-primary-600 hover:text-primary-700 text-sm">
          ← Volver a F&I
        </Link>
      </div>

      <div className="mb-6 bg-primary-50 border border-primary-200 rounded-lg p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-primary-900 mb-1">Cliente: {client.name}</h2>
            <p className="text-sm text-primary-700">{client.phone}</p>
            {client.vehicleMake && (
              <p className="text-sm text-primary-700 mt-1">
                Vehículo: {client.vehicleYear} {client.vehicleMake} {client.vehicleModel}
                {client.vehiclePrice && ` - $${client.vehiclePrice.toLocaleString()}`}
              </p>
            )}
          </div>
          <Link
            href={`/fi/clients/${clientId}/edit`}
            className="text-sm font-medium text-primary-700 hover:text-primary-900 underline"
          >
            Editar cliente / SSN
          </Link>
        </div>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Solicitud F&I completa</h1>
      <p className="text-gray-600 mb-8">
        Incluye todos los empleos, referencias e ingresos. Esta información aparecerá en los PDFs para
        el banco.
      </p>

      <form onSubmit={(e) => handleSubmit(e, false)} className="bg-white shadow rounded-lg p-6">
        <FIExtendedRequestForm data={formData} onChange={setFormData} />

        <div className="flex justify-end space-x-4 mt-8 pt-6 border-t">
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
            {submitting ? 'Guardando…' : 'Guardar borrador'}
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            disabled={submitting}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            {submitting ? 'Enviando…' : 'Enviar a F&I'}
          </button>
        </div>
      </form>
    </div>
  );
}
