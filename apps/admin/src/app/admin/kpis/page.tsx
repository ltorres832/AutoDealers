'use client';

// Dashboard de KPIs según documento maestro

import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface KPIData {
  // Ventas
  totalSales: number;
  verifiedSales: number;
  externalSales: number;
  pendingVerification: number;
  
  // Conversiones
  interactionsToSales: number;
  leadsToSales: number;
  
  // Fraude
  fraudDetected: number;
  fraudScoreAverage: number;
  highRiskSales: number;
  
  // Ingresos (solo admin)
  totalEarnings: number;
  earningsByPartner: Record<string, number>;
  earningsByCategory: Record<string, number>;
  
  // Dealers
  dealersWithFlags: number;
  topDealers: Array<{ dealerId: string; sales: number; name?: string }>;
  
  // Tendencias
  salesTrend: Array<{ date: string; verified: number; external: number }>;
}

export default function KPIsPage() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);

  // Usar API en lugar de hook de tiempo real por ahora (más confiable)
  useEffect(() => {
    fetchKPIs();
  }, [timeRange]);

  const fetchKPIs = async () => {
    setLoading(true);
    const defaultData: KPIData = {
      totalSales: 0,
      verifiedSales: 0,
      externalSales: 0,
      pendingVerification: 0,
      interactionsToSales: 0,
      leadsToSales: 0,
      fraudDetected: 0,
      fraudScoreAverage: 0,
      highRiskSales: 0,
      totalEarnings: 0,
      earningsByPartner: {},
      earningsByCategory: {},
      dealersWithFlags: 0,
      topDealers: [],
      salesTrend: [],
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.warn('Timeout al obtener KPIs');
      }, 10000); // 10 segundos timeout

      const response = await fetch(`/api/admin/kpis?timeRange=${timeRange}`, {
        credentials: 'include',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        console.log('KPIs recibidos:', data);
        setKpiData(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error fetching KPIs:', response.status, errorData);
        // Establecer datos vacíos en caso de error
        setKpiData(defaultData);
      }
    } catch (error: any) {
      console.error('Error fetching KPIs:', error);
      // Establecer datos vacíos en caso de error
      setKpiData(defaultData);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !kpiData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Datos para gráficas
  const salesComparisonData = {
    labels: ['Verificadas', 'Externas', 'Pendientes'],
    datasets: [
      {
        label: 'Ventas',
        data: [
          kpiData.verifiedSales,
          kpiData.externalSales,
          kpiData.pendingVerification,
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(251, 191, 36, 0.8)',
        ],
      },
    ],
  };

  const earningsByPartnerData = {
    labels: Object.keys(kpiData.earningsByPartner),
    datasets: [
      {
        label: 'Ingresos',
        data: Object.values(kpiData.earningsByPartner),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(147, 51, 234, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(251, 146, 60, 0.8)',
        ],
      },
    ],
  };

  const salesTrendData = {
    labels: kpiData.salesTrend.map(t => new Date(t.date).toLocaleDateString('es-ES')),
    datasets: [
      {
        label: 'Verificadas',
        data: kpiData.salesTrend.map(t => t.verified),
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Externas',
        data: kpiData.salesTrend.map(t => t.external),
        borderColor: 'rgba(239, 68, 68, 1)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
      },
    ],
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">KPIs y Métricas</h1>
            <p className="mt-2 text-gray-600">
              Dashboard completo según documento maestro
            </p>
          </div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-md"
          >
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="90d">Últimos 90 días</option>
            <option value="all">Todo el tiempo</option>
          </select>
        </div>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <p className="text-sm text-gray-600 mb-1">Total de Ventas</p>
          <p className="text-3xl font-bold text-gray-900">{kpiData.totalSales}</p>
          <p className="text-xs text-gray-500 mt-2">
            {kpiData.verifiedSales} verificadas, {kpiData.externalSales} externas
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <p className="text-sm text-gray-600 mb-1">Tasa de Verificación</p>
          <p className="text-3xl font-bold text-gray-900">
            {kpiData.totalSales > 0
              ? ((kpiData.verifiedSales / kpiData.totalSales) * 100).toFixed(1)
              : 0}%
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {kpiData.verifiedSales} de {kpiData.totalSales} ventas verificadas
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
          <p className="text-sm text-gray-600 mb-1">Fraude Detectado</p>
          <p className="text-3xl font-bold text-gray-900">{kpiData.fraudDetected}</p>
          <p className="text-xs text-gray-500 mt-2">
            Score promedio: {kpiData.fraudScoreAverage.toFixed(1)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <p className="text-sm text-gray-600 mb-1">Ingresos Totales</p>
          <p className="text-3xl font-bold text-gray-900">
            ${kpiData.totalEarnings.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Solo visible para Admin
          </p>
        </div>
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Comparación de Ventas
          </h3>
          <Pie data={salesComparisonData} />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Ingresos por Partner
          </h3>
          <Bar data={earningsByPartnerData} />
        </div>
      </div>

      {/* Tendencia de Ventas */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Tendencia de Ventas
        </h3>
        <Line data={salesTrendData} />
      </div>

      {/* Top Dealers */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Top Dealers por Ventas
        </h3>
        <div className="space-y-2">
          {kpiData.topDealers.map((dealer, idx) => (
            <div
              key={dealer.dealerId}
              className="flex items-center justify-between p-3 bg-gray-50 rounded"
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg font-bold text-gray-400">#{idx + 1}</span>
                <span className="font-medium text-gray-900">
                  {dealer.name || dealer.dealerId.substring(0, 8)}...
                </span>
              </div>
              <span className="text-lg font-bold text-blue-600">{dealer.sales} ventas</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

