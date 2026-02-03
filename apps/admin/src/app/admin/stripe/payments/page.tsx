'use client';

import { useState, useEffect } from 'react';
import BackButton from '@/components/BackButton';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  customerEmail: string | null;
  description: string | null;
  created: Date;
  paymentMethod: string;
}

export default function StripePaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState('');

  useEffect(() => {
    fetchPayments();
  }, [filter]);

  async function fetchPayments() {
    setLoading(true);
    try {
      const url = filter ? `/api/admin/stripe/payments?status=${filter}` : '/api/admin/stripe/payments';
      const response = await fetch(url);
      const data = await response.json();
      setPayments(data.payments || []);
      setStats(data.stats);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefund(paymentId: string) {
    if (!confirm('¿Confirmar reembolso?')) return;

    try {
      const response = await fetch(`/api/admin/stripe/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: refundAmount ? parseFloat(refundAmount) : undefined,
          reason: 'requested_by_customer',
        }),
      });

      const data = await response.json();
      alert(data.message);
      setRefundingId(null);
      setRefundAmount('');
      fetchPayments();
    } catch (error) {
      alert('Error al procesar reembolso');
    }
  }

  const statusColors: Record<string, string> = {
    succeeded: 'bg-green-100 text-green-800',
    processing: 'bg-blue-100 text-blue-800',
    failed: 'bg-red-100 text-red-800',
    canceled: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <BackButton href="/admin/stripe" label="Volver al Dashboard Stripe" />
      </div>
      <h1 className="text-3xl font-bold mb-6">Pagos y Transacciones</h1>

      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Total Pagos</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Monto Total</div>
            <div className="text-2xl font-bold">${stats.totalAmount.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Exitosos</div>
            <div className="text-2xl font-bold text-green-600">{stats.succeeded}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Fallidos</div>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-2">
          {['', 'succeeded', 'processing', 'failed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status === '' ? 'Todos' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">Cargando...</div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay pagos</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm">{payment.customerEmail || 'Sin email'}</div>
                    <div className="text-xs text-gray-500">{payment.description}</div>
                  </td>
                  <td className="px-6 py-4 font-medium">
                    ${payment.amount.toFixed(2)} {payment.currency.toUpperCase()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${statusColors[payment.status]}`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">{payment.paymentMethod}</td>
                  <td className="px-6 py-4 text-sm">
                    {new Date(payment.created).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    {payment.status === 'succeeded' && (
                      refundingId === payment.id ? (
                        <div className="flex gap-2 items-center">
                          <input
                            type="number"
                            placeholder="Monto (vacío = total)"
                            value={refundAmount}
                            onChange={(e) => setRefundAmount(e.target.value)}
                            className="px-2 py-1 border rounded text-sm w-32"
                          />
                          <button
                            onClick={() => handleRefund(payment.id)}
                            className="text-xs text-green-600 hover:text-green-800"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => {
                              setRefundingId(null);
                              setRefundAmount('');
                            }}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            ✗
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setRefundingId(payment.id)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Reembolsar
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

