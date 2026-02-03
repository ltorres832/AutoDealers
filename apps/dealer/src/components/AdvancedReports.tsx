'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

interface AdvancedReportsProps {
  tenantId: string;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function AdvancedReports({ tenantId }: AdvancedReportsProps) {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    loadReports();
  }, [tenantId, period]);

  async function loadReports() {
    try {
      setLoading(true);
      const response = await fetchWithAuth(`/api/reports/advanced?period=${period}`);
      const data = await response.json();
      setReportData(data);
    } catch (error) {
      console.error('Error loading reports:', error);
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

  if (!reportData) {
    return <div className="text-center p-8 text-gray-500">No hay datos disponibles</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 rounded ${
              period === 'week' ? 'bg-primary-600 text-white' : 'bg-gray-100'
            }`}
          >
            Semana
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded ${
              period === 'month' ? 'bg-primary-600 text-white' : 'bg-gray-100'
            }`}
          >
            Mes
          </button>
          <button
            onClick={() => setPeriod('year')}
            className={`px-4 py-2 rounded ${
              period === 'year' ? 'bg-primary-600 text-white' : 'bg-gray-100'
            }`}
          >
            Año
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Tasa de Conversión</h3>
          <p className="text-3xl font-bold text-primary-600 mt-2">
            {reportData.conversionRate?.toFixed(1) || 0}%
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Tiempo Promedio</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {reportData.avgTimeInPipeline || 0} días
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Score Promedio</h3>
          <p className="text-3xl font-bold text-yellow-600 mt-2">
            {reportData.avgScore?.toFixed(0) || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">ROI por Canal</h3>
          <p className="text-3xl font-bold text-purple-600 mt-2">
            {reportData.topROIChannel || 'N/A'}
          </p>
        </div>
      </div>

      {/* Gráfico de Conversión por Fuente */}
      {reportData.conversionBySource && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Conversión por Fuente</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.conversionBySource}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="source" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="leads" fill="#3B82F6" name="Leads" />
              <Bar dataKey="converted" fill="#10B981" name="Convertidos" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Gráfico de Pipeline */}
      {reportData.pipelineData && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Pipeline de Ventas</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={reportData.pipelineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="new"
                stroke="#3B82F6"
                name="Nuevos"
              />
              <Line
                type="monotone"
                dataKey="qualified"
                stroke="#10B981"
                name="Calificados"
              />
              <Line
                type="monotone"
                dataKey="closed"
                stroke="#8B5CF6"
                name="Cerrados"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Distribución por Estado */}
      {reportData.statusDistribution && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Distribución por Estado</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={reportData.statusDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {reportData.statusDistribution.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Score Distribution */}
      {reportData.scoreDistribution && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Distribución de Scores</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.scoreDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#F59E0B" name="Cantidad de Leads" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tiempo en cada Etapa */}
      {reportData.timeInStage && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Tiempo Promedio en cada Etapa</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.timeInStage} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="stage" type="category" />
              <Tooltip />
              <Bar dataKey="days" fill="#8B5CF6" name="Días" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}


