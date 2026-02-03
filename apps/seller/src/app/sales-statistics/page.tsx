'use client';

import { useState, useEffect } from 'react';

interface SalesStatistics {
  period: 'day' | 'week' | 'month';
  totalSales: number;
  totalRevenue: number;
  byDay?: Array<{
    date: string;
    sales: number;
    revenue: number;
  }>;
}

export default function SalesStatisticsPage() {
  const [statistics, setStatistics] = useState<SalesStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');

  useEffect(() => {
    fetchStatistics();
  }, [period]);

  async function fetchStatistics() {
    setLoading(true);
    try {
      const response = await fetch(`/api/sales/statistics?period=${period}`);
      if (response.ok) {
        const data = await response.json();
        setStatistics(data.statistics);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const periodLabels = {
    day: 'Hoy',
    week: 'Esta Semana',
    month: 'Este Mes',
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">Mis Estadísticas de Ventas</h1>
        
        {/* Selector de Período */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setPeriod('day')}
            className={`px-4 py-2 rounded ${
              period === 'day'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Día
          </button>
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 rounded ${
              period === 'week'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Semana
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded ${
              period === 'month'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Mes
          </button>
        </div>
      </div>

      {statistics && (
        <div className="space-y-6">
          {/* Resumen General */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-2 text-gray-600">
                Total de Ventas ({periodLabels[period]})
              </h2>
              <p className="text-4xl font-bold text-primary-600">
                {statistics.totalSales}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-2 text-gray-600">
                Revenue Total ({periodLabels[period]})
              </h2>
              <p className="text-4xl font-bold text-green-600">
                ${statistics.totalRevenue.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Gráfico por Día */}
          {statistics.byDay && statistics.byDay.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Ventas por Día</h2>
              <div className="space-y-3">
                {statistics.byDay.map((day) => (
                  <div key={day.date} className="flex items-center gap-4">
                    <div className="w-24 text-sm text-gray-600">
                      {new Date(day.date).toLocaleDateString('es-ES', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="bg-primary-600 h-6 rounded"
                          style={{
                            width: `${(day.sales / Math.max(...statistics.byDay!.map(d => d.sales))) * 100}%`,
                            minWidth: '20px',
                          }}
                        ></div>
                        <span className="text-sm font-medium">{day.sales} ventas</span>
                      </div>
                    </div>
                    <div className="w-32 text-right text-sm font-medium text-green-600">
                      ${day.revenue.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {statistics.totalSales === 0 && (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              <p>No hay ventas registradas para este período</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}



