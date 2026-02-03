'use client';

import React from 'react';
import Link from 'next/link';

export default function QuickActions() {
  const actions = [
    { label: 'Crear Usuario', href: '/admin/users' },
    { label: 'Crear Membresía', href: '/admin/memberships' },
    { label: 'Ver Tenants', href: '/admin/tenants' },
    { label: 'Configurar IA', href: '/admin/settings' },
    { label: 'Ver Logs', href: '/admin/logs' },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Acciones Rápidas</h2>
      
      <div className="space-y-2">
        {actions.map((action, index) => (
          <Link
            key={index}
            href={action.href}
            className="block w-full text-left px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 rounded hover:bg-primary-100 transition"
          >
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

