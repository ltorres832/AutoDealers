'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#E10600', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

interface ReportData {
  leads: Array<{ date: string; count: number }>;
  sales: Array<{ date: string; amount: number; count: number }>;
  leadsBySource: Array<{ name: string; value: number }>;
  leadsByStatus: Array<{ name: string; value: number }>;
  salesBySeller: Array<{ name: string; value: number }>;
  conversionRate: number;
}

export default function ReportsPage() {
  const { auth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [reportData, setReportData] = useState<ReportData | null>(null);

  useEffect(() => {
    loadReport();
  }, [period, auth?.tenantId]);

  async function loadReport() {
    if (!auth?.tenantId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/reports/leads?period=${period}`);
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      }
    } catch (error) {
      console.error('Error loading report:', error);
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Reportes</h1>
          <p className="text-gray-600 mt-2">Análisis y métricas de tu negocio</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as any)}
          className="border rounded px-4 py-2"
        >
          <option value="week">Última Semana</option>
          <option value="month">Último Mes</option>
          <option value="year">Último Año</option>
        </select>
      </div>

      {reportData ? (
        <div className="space-y-6">
          {/* Métricas principales */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Tasa de Conversión</p>
              <p className="text-3xl font-bold text-primary-600">
                {reportData.conversionRate.toFixed(1)}%
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Total Leads</p>
              <p className="text-3xl font-bold">
                {reportData.leads.reduce((sum, d) => sum + d.count, 0)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Total Ventas</p>
              <p className="text-3xl font-bold">
                {reportData.sales.reduce((sum, d) => sum + d.count, 0)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Revenue Total</p>
              <p className="text-3xl font-bold text-green-600">
                ${reportData.sales.reduce((sum, d) => sum + d.amount, 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tendencia de Leads */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-4">Tendencia de Leads</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={reportData.leads}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#E10600" strokeWidth={2} name="Leads" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Ventas por Día */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-4">Ventas por Día</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reportData.sales}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => `$${value.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="amount" fill="#10B981" name="Revenue ($)" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Leads por Fuente */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-4">Leads por Fuente</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={reportData.leadsBySource}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {reportData.leadsBySource.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Leads por Estado */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-4">Leads por Estado</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reportData.leadsByStatus}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#8B5CF6" name="Cantidad" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Ventas por Vendedor */}
            {reportData.salesBySeller.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
                <h3 className="text-lg font-bold mb-4">Ventas por Vendedor</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData.salesBySeller}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => `$${value.toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="value" fill="#F59E0B" name="Ventas ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">No hay datos disponibles para el período seleccionado</p>
        </div>
      )}
    </div>
  );
}
