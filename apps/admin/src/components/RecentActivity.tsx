'use client';

import React from 'react';

interface RecentActivityProps {
  leads?: any[];
  sales?: any[];
}

export default function RecentActivity({ leads = [], sales = [] }: RecentActivityProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Actividad Reciente</h2>
      
      {(leads.length === 0 && sales.length === 0) ? (
        <p className="text-gray-500 text-center py-8">
          No hay actividad reciente
        </p>
      ) : (
        <div className="space-y-4">
          {leads.slice(0, 5).map((lead: any, index: number) => (
            <div key={`lead-${index}`} className="border-b pb-4 last:border-0">
              <p className="text-sm text-gray-600">Nuevo lead: {lead.name || lead.email || 'Sin nombre'}</p>
              <p className="text-xs text-gray-400 mt-1">
                {lead.createdAt ? new Date(lead.createdAt).toLocaleString() : 'Reciente'}
              </p>
            </div>
          ))}
          {sales.slice(0, 5).map((sale: any, index: number) => (
            <div key={`sale-${index}`} className="border-b pb-4 last:border-0">
              <p className="text-sm text-gray-600">Venta realizada: ${sale.amount?.toLocaleString() || '0'}</p>
              <p className="text-xs text-gray-400 mt-1">
                {sale.createdAt ? new Date(sale.createdAt).toLocaleString() : 'Reciente'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

