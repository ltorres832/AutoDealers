'use client';

import { useState, useEffect } from 'react';
import ScoringConfig from '@/components/ScoringConfig';
import ScoringRules from '@/components/ScoringRules';

export default function AdminScoringPage() {
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'config' | 'rules'>('config');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Scoring Avanzado de Leads</h1>
        <p className="text-gray-600 mt-1">
          Configura el sistema de puntuación automática y manual de leads
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

      <div className="mb-6 border-b">
        <nav className="flex space-x-4">
          <button
            onClick={() => setActiveTab('config')}
            className={`py-2 px-4 border-b-2 ${
              activeTab === 'config'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Configuración
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`py-2 px-4 border-b-2 ${
              activeTab === 'rules'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Reglas de Scoring
          </button>
        </nav>
      </div>

      {activeTab === 'config' && (
        <ScoringConfig tenantId={selectedTenantId || undefined} />
      )}
      {activeTab === 'rules' && (
        <ScoringRules tenantId={selectedTenantId || undefined} />
      )}
    </div>
  );
}
