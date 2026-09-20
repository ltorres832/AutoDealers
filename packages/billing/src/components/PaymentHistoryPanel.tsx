'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PaymentHistoryFilter, TenantPaymentRecord } from '../payment-history';

export interface PaymentHistoryPanelProps {
  apiPath?: string;
  fetchFn?: (url: string) => Promise<Response>;
  showTitle?: boolean;
  className?: string;
}

type FilterOption = PaymentHistoryFilter;

const FILTERS: { value: FilterOption; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'membership', label: 'Membresía' },
  { value: 'promotion', label: 'Promociones' },
  { value: 'banner', label: 'Banners' },
  { value: 'featured', label: 'Destacados' },
];

function getStatusColor(status: string) {
  switch (status) {
    case 'completed':
    case 'active':
    case 'paid':
    case 'succeeded':
      return 'bg-green-100 text-green-700';
    case 'pending':
    case 'pending_payment':
      return 'bg-yellow-100 text-yellow-700';
    case 'rejected':
    case 'failed':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getStatusText(status: string) {
  switch (status) {
    case 'completed':
      return 'Completado';
    case 'active':
      return 'Activo';
    case 'paid':
    case 'succeeded':
      return 'Pagado';
    case 'pending':
    case 'pending_payment':
      return 'Pendiente';
    case 'rejected':
      return 'Rechazado';
    case 'failed':
      return 'Fallido';
    default:
      return status;
  }
}

function getCategoryLabel(category: TenantPaymentRecord['category']) {
  switch (category) {
    case 'membership':
      return '💎 Membresía';
    case 'promotion':
      return '🎁 Promoción';
    case 'banner':
      return '🎨 Banner';
    case 'featured':
      return '⭐ Destacado';
    default:
      return category;
  }
}

function getCategoryColor(category: TenantPaymentRecord['category']) {
  switch (category) {
    case 'membership':
      return 'bg-indigo-100 text-indigo-700';
    case 'promotion':
      return 'bg-primary-100 text-primary-700';
    case 'banner':
      return 'bg-yellow-100 text-yellow-700';
    case 'featured':
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function formatAmount(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('es-PR', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount || 0);
  } catch {
    return `$${(amount || 0).toFixed(2)} ${currency || 'USD'}`;
  }
}

export function PaymentHistoryPanel({
  apiPath = '/api/payments/history',
  fetchFn = fetch,
  showTitle = true,
  className = '',
}: PaymentHistoryPanelProps) {
  const [payments, setPayments] = useState<TenantPaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterOption>('all');

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter === 'all' ? apiPath : `${apiPath}?type=${filter}`;
      const response = await fetchFn(url);
      if (response.ok) {
        const data = await response.json();
        setPayments(data.payments || []);
      } else {
        setPayments([]);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [apiPath, fetchFn, filter]);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  return (
    <div className={className}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {showTitle ? <h2 className="text-xl font-bold text-gray-900">Historial de pagos</h2> : null}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`rounded px-3 py-1 text-sm ${
                filter === item.value ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600" />
        </div>
      ) : payments.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center shadow">
          <div className="mb-2 text-4xl">💳</div>
          <p className="text-gray-600">No hay pagos registrados</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Descripción</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Monto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Recibo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={`${payment.source}-${payment.id}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      {payment.paidAt
                        ? new Date(payment.paidAt).toLocaleDateString()
                        : payment.createdAt
                          ? new Date(payment.createdAt).toLocaleDateString()
                          : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`rounded px-2 py-1 text-xs ${getCategoryColor(payment.category)}`}>
                        {getCategoryLabel(payment.category)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{payment.description}</td>
                    <td className="px-4 py-3 text-sm font-semibold">
                      {formatAmount(payment.amount, payment.currency)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`rounded px-2 py-1 text-xs ${getStatusColor(payment.status)}`}>
                        {getStatusText(payment.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {payment.invoiceUrl ? (
                        <a
                          href={payment.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:underline"
                        >
                          Ver factura
                        </a>
                      ) : payment.receiptNumber ? (
                        <span className="text-gray-600">{payment.receiptNumber}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export type { PaymentHistoryFilter, TenantPaymentRecord };
