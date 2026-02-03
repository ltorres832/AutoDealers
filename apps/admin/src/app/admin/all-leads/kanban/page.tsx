'use client';

import { useState } from 'react';
import LeadsKanban from '@/components/LeadsKanban';
import Link from 'next/link';

export default function AdminLeadsKanbanPage() {
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [tenants, setTenants] = useState<any[]>([]);

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

      <LeadsKanban tenantId={selectedTenantId || undefined} />
    </div>
  );
}


