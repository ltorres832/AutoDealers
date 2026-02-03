'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason: string;
  featureName?: string;
  currentLimit?: number;
  requiredPlan?: string;
}

interface MembershipPlan {
  id: string;
  name: string;
  type: string;
  price: number;
  currency: string;
  billingCycle: string;
  features: any;
  isActive: boolean;
  stripePriceId: string;
}

export default function UpgradeModal({
  isOpen,
  onClose,
  reason,
  featureName,
  currentLimit,
  requiredPlan,
}: UpgradeModalProps) {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPlans();
    }
  }, [isOpen]);

  async function fetchPlans() {
    try {
      console.log('🔍 [SELLER FRONTEND] UpgradeModal: Obteniendo planes disponibles...');
      const response = await fetch('/api/membership/available-plans');
      console.log('📡 [SELLER FRONTEND] UpgradeModal: Respuesta recibida:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 [SELLER FRONTEND] UpgradeModal: Planes recibidos:', data.plans?.length || 0);
        setPlans(data.plans || []);
        
        if (!data.plans || data.plans.length === 0) {
          console.warn('⚠️ [SELLER FRONTEND] UpgradeModal: No hay planes disponibles');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ [SELLER FRONTEND] UpgradeModal: Error obteniendo planes:', {
          status: response.status,
          error: errorData,
        });
        setPlans([]);
      }
    } catch (error) {
      console.error('❌ [SELLER FRONTEND] UpgradeModal: Error general:', error);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpgrade(planId: string) {
    setUpgrading(true);
    try {
      const response = await fetch('/api/membership/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          alert('Upgrade iniciado. Revisa tu email para completar el pago.');
          onClose();
        }
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'No se pudo iniciar el upgrade'}`);
      }
    } catch (error) {
      console.error('Error upgrading:', error);
      alert('Error al procesar el upgrade');
    } finally {
      setUpgrading(false);
    }
  }

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-full p-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold">🔒 Feature No Disponible</h2>
                <p className="text-sm opacity-90">Tu plan actual no incluye esta funcionalidad</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Mensaje de error/razón */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  {featureName ? `Feature: ${featureName}` : 'Límite Alcanzado'}
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>{reason}</p>
                  {currentLimit && (
                    <p className="mt-1 font-semibold">
                      Has alcanzado tu límite actual: {currentLimit}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Planes disponibles */}
          <div>
            <h3 className="text-xl font-bold mb-4">💎 Mejora tu Plan</h3>
            <p className="text-gray-600 mb-6">
              Elige un plan superior para desbloquear esta funcionalidad y muchas más:
            </p>

            {loading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className="border-2 border-gray-200 rounded-lg p-6 hover:border-primary-500 hover:shadow-lg transition"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xl font-bold text-gray-900">{plan.name}</h4>
                      {plan.name.toLowerCase().includes('pro') && (
                        <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                          RECOMENDADO
                        </span>
                      )}
                    </div>
                    
                    <div className="mb-4">
                      <span className="text-4xl font-bold text-gray-900">
                        ${plan.price}
                      </span>
                      <span className="text-gray-600 ml-2">
                        /{plan.billingCycle === 'monthly' ? 'mes' : 'año'}
                      </span>
                    </div>

                    <ul className="space-y-2 mb-6">
                      {plan.features.customSubdomain && (
                        <li className="flex items-center text-sm">
                          <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Subdominio personalizado
                        </li>
                      )}
                      {plan.features.aiEnabled && (
                        <li className="flex items-center text-sm">
                          <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          IA y respuestas automáticas
                        </li>
                      )}
                      {plan.features.socialMediaEnabled && (
                        <li className="flex items-center text-sm">
                          <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Integración redes sociales
                        </li>
                      )}
                      {plan.features.advancedReports && (
                        <li className="flex items-center text-sm">
                          <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Reportes avanzados
                        </li>
                      )}
                    </ul>

                    <button
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={upgrading}
                      className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3 rounded-lg font-semibold hover:from-primary-700 hover:to-primary-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {upgrading ? 'Procesando...' : `Actualizar a ${plan.name}`}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-blue-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-sm font-semibold text-blue-900">💡 ¿Necesitas ayuda?</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Contáctanos para obtener asesoría personalizada sobre qué plan es mejor para ti.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}


