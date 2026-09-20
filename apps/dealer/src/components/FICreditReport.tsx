'use client';

import { useState } from 'react';

interface CreditReport {
  creditScore: number;
  creditRange: 'excellent' | 'good' | 'fair' | 'poor' | 'very_poor';
  paymentHistory: {
    onTime: number;
    late: number;
    missed: number;
    totalAccounts: number;
  };
  currentDebts: number;
  openCreditLines: number;
  inquiries: number;
  verified: boolean;
  reportDate: string;
  provider: string;
}

interface FICreditReportProps {
  clientId: string;
  onReportReceived?: (report: CreditReport) => void;
}

export default function FICreditReport({ clientId, onReportReceived }: FICreditReportProps) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<CreditReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [provider] = useState<'experian' | 'equifax' | 'transunion' | 'mock'>('mock');

  async function fetchCreditReport() {
    if (!clientId) {
      setError('Client ID is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { fetchWithAuth } = await import('@/lib/fetch-with-auth');
      const response = await fetchWithAuth('/api/fi/credit-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, provider }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch credit report');
      }

      const data = await response.json();
      setReport(data.creditReport);
      if (onReportReceived) {
        onReportReceived(data.creditReport);
      }
    } catch (err: any) {
      console.error('Error fetching credit report:', err);
      setError(err.message || 'Error al obtener reporte de crédito');
    } finally {
      setLoading(false);
    }
  }

  const getCreditRangeColor = (range: string) => {
    switch (range) {
      case 'excellent':
        return 'text-green-700 bg-green-100';
      case 'good':
        return 'text-primary-700 bg-primary-100';
      case 'fair':
        return 'text-yellow-700 bg-yellow-100';
      case 'poor':
        return 'text-orange-700 bg-orange-100';
      case 'very_poor':
        return 'text-red-700 bg-red-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const getCreditRangeLabel = (range: string) => {
    switch (range) {
      case 'excellent':
        return 'Excelente';
      case 'good':
        return 'Bueno';
      case 'fair':
        return 'Regular';
      case 'poor':
        return 'Bajo';
      case 'very_poor':
        return 'Muy Bajo';
      default:
        return range;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">Reporte de Crédito</h3>
          <p className="text-xs text-amber-800 mt-1">
            Vista previa de ejemplo para práctica del flujo F&amp;I. La consulta en vivo a burós se activa con integración
            certificada.
          </p>
        </div>
        {!report && (
          <button
            onClick={fetchCreditReport}
            disabled={loading || !clientId}
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm shrink-0"
          >
            {loading ? 'Generando…' : 'Generar vista previa'}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      )}

      {report && (
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Datos de ejemplo — no son un reporte oficial de buró.
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded">
              <div className="text-sm text-gray-600 mb-1">Score de Crédito</div>
              <div className="text-3xl font-bold">{report.creditScore}</div>
              <div className={`mt-2 inline-block px-2 py-1 rounded text-xs font-medium ${getCreditRangeColor(report.creditRange)}`}>
                {getCreditRangeLabel(report.creditRange)}
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <div className="text-sm text-gray-600 mb-1">Fuente</div>
              <div className="text-lg font-semibold">Vista previa</div>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(report.reportDate).toLocaleDateString('es-ES')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-primary-50 rounded">
              <div className="text-xs text-gray-600 mb-1">Deudas Actuales</div>
              <div className="text-lg font-semibold">
                ${report.currentDebts.toLocaleString()}
              </div>
            </div>
            <div className="p-3 bg-green-50 rounded">
              <div className="text-xs text-gray-600 mb-1">Líneas de Crédito</div>
              <div className="text-lg font-semibold">{report.openCreditLines}</div>
            </div>
            <div className="p-3 bg-yellow-50 rounded">
              <div className="text-xs text-gray-600 mb-1">Consultas Recientes</div>
              <div className="text-lg font-semibold">{report.inquiries}</div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded">
            <div className="text-sm font-semibold mb-2">Historial de Pagos</div>
            <div className="grid grid-cols-4 gap-2 text-sm">
              <div>
                <div className="text-gray-600">A Tiempo</div>
                <div className="font-semibold text-green-700">{report.paymentHistory.onTime}</div>
              </div>
              <div>
                <div className="text-gray-600">Tardíos</div>
                <div className="font-semibold text-yellow-700">{report.paymentHistory.late}</div>
              </div>
              <div>
                <div className="text-gray-600">Perdidos</div>
                <div className="font-semibold text-red-700">{report.paymentHistory.missed}</div>
              </div>
              <div>
                <div className="text-gray-600">Total Cuentas</div>
                <div className="font-semibold">{report.paymentHistory.totalAccounts}</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setReport(null);
              setError(null);
            }}
            className="w-full px-4 py-2 border rounded hover:bg-gray-50 text-sm"
          >
            Nueva vista previa
          </button>
        </div>
      )}

      {!report && !loading && (
        <div className="text-center py-8 text-gray-500 text-sm">
          Genera una vista previa para practicar el flujo de evaluación crediticia con el cliente.
        </div>
      )}
    </div>
  );
}


