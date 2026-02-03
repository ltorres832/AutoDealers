'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/DashboardLayout';

interface Payment {
  id: string;
  type: 'payment_intent' | 'invoice';
  amount: number;
  currency: string;
  status: string;
  description: string;
  created: string;
  metadata?: Record<string, string>;
  invoiceUrl?: string;
  invoicePdf?: string;
}

export default function PaymentsHistoryPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPayments();
  }, []);

  async function fetchPayments() {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/advertiser/payments');
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        if (response.ok) {
          const data = await response.json();
          setPayments(data.payments || []);
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
          setError(errorData.error || 'Error al cargar pagos');
        }
      } else {
        setError('El servidor devolvió una respuesta inválida');
      }
    } catch (err: any) {
      console.error('Error fetching payments:', err);
      setError(err.message || 'Error al cargar pagos');
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      succeeded: 'bg-green-100 text-green-800',
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      canceled: 'bg-gray-100 text-gray-800',
      requires_payment_method: 'bg-orange-100 text-orange-800',
    };
    const labels: Record<string, string> = {
      succeeded: 'Completado',
      paid: 'Pagado',
      pending: 'Pendiente',
      failed: 'Fallido',
      canceled: 'Cancelado',
      requires_payment_method: 'Requiere método de pago',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
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

  const totalPaid = payments
    .filter(p => p.status === 'succeeded' || p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Historial de Pagos</h1>
          <p className="text-gray-600">Revisa todos tus pagos y facturas</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Resumen */}
        {!loading && payments.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">Total Pagado</div>
                <div className="text-2xl font-bold text-green-600">
                  ${totalPaid.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Total de Pagos</div>
                <div className="text-2xl font-bold text-gray-900">
                  {payments.length}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Pagos Exitosos</div>
                <div className="text-2xl font-bold text-green-600">
                  {payments.filter(p => p.status === 'succeeded' || p.status === 'paid').length}
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600">Cargando historial de pagos...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">💳</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay pagos registrados</h3>
            <p className="text-gray-600">
              Cuando realices pagos por anuncios, aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(payment.created)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {payment.description}
                      {payment.metadata?.adId && (
                        <div className="text-xs text-gray-500 mt-1">
                          Anuncio ID: {payment.metadata.adId}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {payment.currency} {payment.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(payment.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.type === 'invoice' ? 'Factura' : 'Pago'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {payment.invoiceUrl && (
                        <a
                          href={payment.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Ver Factura
                        </a>
                      )}
                      {payment.invoicePdf && (
                        <a
                          href={payment.invoicePdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-900"
                        >
                          PDF
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
