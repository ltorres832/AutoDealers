'use client';

import { useState, useEffect } from 'react';
import WorkflowsList from '@/components/WorkflowsList';

export default function AdminWorkflowsPage() {
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Workflows Automatizados</h1>
        <p className="text-gray-600 mt-1">
          Crea reglas automáticas para optimizar procesos
        </p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Filtrar por Tenant (opcional)</label>
        <input
          type="text"
          value={selectedTenantId}
          onChange={(e) => setSelectedTenantId(e.target.value)}
          placeholder="ID del tenant o dejar vacío para ver todos"
          className="w-full max-w-md border rounded px-3 py-2"
        />
      </div>

      <WorkflowsList tenantId={selectedTenantId || undefined} />
    </div>
  );
}


