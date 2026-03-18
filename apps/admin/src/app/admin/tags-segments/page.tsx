'use client';

import { useState } from 'react';
import TagsManager from '@/components/TagsManager';
import SegmentsManager from '@/components/SegmentsManager';

export default function TagsSegmentsPage() {
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'tags' | 'segments'>('tags');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Etiquetas y Segmentación</h1>
        <p className="text-gray-600 mt-1">
          Organiza y segmenta leads con etiquetas personalizadas y segmentos dinámicos
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
            onClick={() => setActiveTab('tags')}
            className={`py-2 px-4 border-b-2 ${
              activeTab === 'tags'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Etiquetas
          </button>
          <button
            onClick={() => setActiveTab('segments')}
            className={`py-2 px-4 border-b-2 ${
              activeTab === 'segments'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Segmentos
          </button>
        </nav>
      </div>

      {activeTab === 'tags' && (
        <TagsManager tenantId={selectedTenantId || undefined} />
      )}
      {activeTab === 'segments' && (
        <SegmentsManager tenantId={selectedTenantId || undefined} />
      )}
    </div>
  );
}
