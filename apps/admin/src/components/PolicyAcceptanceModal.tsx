'use client';

import { useState, useEffect } from 'react';

interface Policy {
  id: string;
  type: string;
  title: string;
  content: string;
  version: string;
  isRequired: boolean;
}

interface PolicyAcceptanceModalProps {
  userId: string;
  role: 'admin' | 'dealer' | 'seller' | 'public' | 'advertiser';
  tenantId?: string;
  onComplete: () => void;
}

export function PolicyAcceptanceModal({
  userId,
  role,
  tenantId,
  onComplete,
}: PolicyAcceptanceModalProps) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptedPolicies, setAcceptedPolicies] = useState<Set<string>>(new Set());
  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    fetchRequiredPolicies();
  }, [userId, role, tenantId]);

  async function fetchRequiredPolicies() {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/policies/required?userId=${userId}&role=${role}${tenantId ? `&tenantId=${tenantId}` : ''}`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const data = await response.json();
        setPolicies(data.policies || []);
      }
    } catch (error) {
      console.error('Error fetching required policies:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAcceptAll() {
    if (policies.length === 0) {
      onComplete();
      return;
    }

    try {
      setAccepting(true);
      const acceptPromises = policies.map(policy =>
        fetch(`/api/policies/${policy.id}/accept`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userId }),
        })
      );

      await Promise.all(acceptPromises);
      onComplete();
    } catch (error) {
      console.error('Error accepting policies:', error);
      alert('Error al aceptar las políticas. Por favor, inténtalo de nuevo.');
    } finally {
      setAccepting(false);
    }
  }

  async function handleAcceptPolicy(policyId: string) {
    try {
      const response = await fetch(`/api/policies/${policyId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        setAcceptedPolicies(prev => new Set([...prev, policyId]));
        
        // Si todas las políticas requeridas están aceptadas, cerrar modal
        if (acceptedPolicies.size + 1 === policies.length) {
          setTimeout(() => onComplete(), 500);
        }
      }
    } catch (error) {
      console.error('Error accepting policy:', error);
      alert('Error al aceptar la política. Por favor, inténtalo de nuevo.');
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (policies.length === 0) {
    return null; // No hay políticas requeridas
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-blue-600 text-white px-6 py-4">
          <h2 className="text-2xl font-bold">Políticas Requeridas</h2>
          <p className="text-sm mt-1">
            Debes aceptar las siguientes políticas para continuar usando la plataforma
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {policies.map((policy) => {
            const isAccepted = acceptedPolicies.has(policy.id);
            const isExpanded = expandedPolicy === policy.id;

            return (
              <div
                key={policy.id}
                className={`border-2 rounded-lg ${
                  isAccepted
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 bg-white'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {policy.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Versión {policy.version}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      {isAccepted && (
                        <span className="text-green-600 font-medium">✓ Aceptada</span>
                      )}
                      <button
                        onClick={() => setExpandedPolicy(isExpanded ? null : policy.id)}
                        className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800"
                      >
                        {isExpanded ? 'Ocultar' : 'Ver Contenido'}
                      </button>
                      {!isAccepted && (
                        <button
                          onClick={() => handleAcceptPolicy(policy.id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                        >
                          Aceptar
                        </button>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div
                        className="prose max-w-none text-gray-700 whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{
                          __html: policy.content.replace(/\n/g, '<br />'),
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {acceptedPolicies.size} de {policies.length} políticas aceptadas
            </p>
            <button
              onClick={handleAcceptAll}
              disabled={accepting || acceptedPolicies.size === policies.length}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {accepting ? 'Aceptando...' : 'Aceptar Todas'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


