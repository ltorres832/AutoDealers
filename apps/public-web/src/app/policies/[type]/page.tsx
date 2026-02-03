'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface Policy {
  id: string;
  type: string;
  title: string;
  content: string;
  version: string;
  language: string;
  effectiveDate: string;
}

export default function PolicyPage() {
  const params = useParams();
  const type = params.type as string;
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPolicy();
  }, [type]);

  async function fetchPolicy() {
    try {
      setLoading(true);
      const response = await fetch(`/api/policies/${type}?language=es`);
      
      if (response.ok) {
        const data = await response.json();
        setPolicy(data.policy);
      }
    } catch (error) {
      console.error('Error fetching policy:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Política no encontrada</h1>
        <p className="text-gray-600">La política solicitada no está disponible.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{policy.title}</h1>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>Versión: {policy.version}</span>
            <span>•</span>
            <span>Efectiva desde: {new Date(policy.effectiveDate).toLocaleDateString('es-ES')}</span>
          </div>
        </div>

        <div className="prose max-w-none">
          <div 
            className="text-gray-700 whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: policy.content.replace(/\n/g, '<br />') }}
          />
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Última actualización: {new Date(policy.effectiveDate).toLocaleDateString('es-ES')}
          </p>
        </div>
      </div>
    </div>
  );
}


