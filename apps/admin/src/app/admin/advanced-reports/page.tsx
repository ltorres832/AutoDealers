'use client';

import { useState, useEffect } from 'react';
import AdvancedReportsDashboard from '@/components/AdvancedReportsDashboard';

export default function AdvancedReportsPage() {
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Reportes Visuales Avanzados</h1>
        <p className="text-gray-600 mt-1">
          Dashboards interactivos con análisis detallado de rendimiento
        </p>
      </div>

      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Filtrar por Tenant (opcional)</label>
            <input
              type="text"
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              placeholder="ID del tenant o dejar vacío para ver todos"
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Rango de Fechas</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="90d">Últimos 90 días</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>

          {dateRange === 'custom' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">Desde</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Hasta</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <AdvancedReportsDashboard
        tenantId={selectedTenantId || undefined}
        dateRange={dateRange}
        customStartDate={customStartDate || undefined}
        customEndDate={customEndDate || undefined}
      />
    </div>
  );
}
