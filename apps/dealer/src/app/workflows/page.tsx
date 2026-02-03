'use client';

import { useState, useEffect } from 'react';
import WorkflowsList from '@/components/WorkflowsList';

export default function WorkflowsPage() {
  const [user, setUser] = useState<any>(null);

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
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Workflows Automatizados</h1>
        <p className="text-gray-600 mt-1">
          Crea reglas automáticas para optimizar tu proceso de ventas
        </p>
      </div>

      <WorkflowsList tenantId={user.tenantId} />
    </div>
  );
}


