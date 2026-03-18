'use client';

import { useState } from 'react';
import LeadsKanbanEnhanced from '@/components/LeadsKanbanEnhanced';
import Link from 'next/link';

export default function AdminLeadsKanbanPage() {
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Pipeline de Leads</h1>
          <p className="text-gray-600 mt-1">Vista Kanban de todos los leads</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/all-leads"
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Vista de Lista
          </Link>
        </div>
      </div>

      {/* Filtro opcional por tenant */}
      {selectedTenantId && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700">
            Filtrando por tenant: <strong>{selectedTenantId}</strong>
          </p>
        </div>
      )}

      <LeadsKanbanEnhanced tenantId={selectedTenantId || undefined} />
    </div>
  );
}
