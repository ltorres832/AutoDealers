'use client';

import { useState, useEffect } from 'react';
import LeadsKanban from '@/components/LeadsKanban';
import Link from 'next/link';

export default function LeadsKanbanPage() {
  const [user, setUser] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  useEffect(() => {
    fetch('/api/user')
      .then(res => res.json())
      .then(data => setUser(data.user))
      .catch(err => console.error('Error fetching user:', err));
  }, []);

  if (!user) {
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
          <h1 className="text-3xl font-bold">Pipeline de Leads</h1>
          <p className="text-gray-600 mt-1">Gestiona tus leads visualmente</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/leads"
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Vista de Lista
          </Link>
          <button
            onClick={() => setViewMode(viewMode === 'kanban' ? 'list' : 'kanban')}
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            {viewMode === 'kanban' ? 'Vista Lista' : 'Vista Kanban'}
          </button>
        </div>
      </div>

      <LeadsKanban tenantId={user.tenantId} />
    </div>
  );
}


