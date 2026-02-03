'use client';

import { useState, useEffect } from 'react';
import { useRealtimeAdvertiserPricing } from '@/hooks/useRealtimeAdvertiserPricing';

interface PlanConfig {
  priceId: string;
  amount: number; // en centavos
  currency: string;
  name: string;
  features: string[];
}

interface PricingConfig {
  starter: PlanConfig;
  professional: PlanConfig;
  premium: PlanConfig;
}

export default function AdvertiserPricingPage() {
  const { config, loading } = useRealtimeAdvertiserPricing();
  const [editingPlan, setEditingPlan] = useState<'starter' | 'professional' | 'premium' | null>(null);
  const [formData, setFormData] = useState<PlanConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  function handleEdit(plan: 'starter' | 'professional' | 'premium') {
    setEditingPlan(plan);
    setFormData({ ...config[plan] });
  }

  function handleCancel() {
    setEditingPlan(null);
    setFormData(null);
    setMessage(null);
  }

  async function handleSave() {
    if (!editingPlan || !formData) return;

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/advertiser-pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: editingPlan,
          config: formData,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // El hook useRealtimeAdvertiserPricing actualizará automáticamente
        // el config con el nuevo Price ID generado por Stripe
        setMessage({ 
          type: 'success', 
          text: data.message || `Plan guardado exitosamente. Stripe Price ID: ${data.config?.[editingPlan]?.priceId || 'Generado automáticamente'}` 
        });
        setEditingPlan(null);
        setFormData(null);
        setTimeout(() => setMessage(null), 5000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al guardar' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Configuración de Precios - Anunciantes</h1>
        <p className="text-gray-600">
          Configura los precios y Stripe Price IDs para los planes de empresas externas.
          Los cambios se sincronizan en tiempo real con la página pública.
        </p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {(['starter', 'professional', 'premium'] as const).map((planKey) => {
          const plan = config[planKey];
          const isEditing = editingPlan === planKey;

          return (
            <div key={planKey} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  ${(plan.amount / 100).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">por mes</div>
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      💡 <strong>Automático:</strong> El sistema creará/actualizará el producto y precio en Stripe automáticamente al guardar.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Precio (centavos) *
                    </label>
                    <input
                      type="number"
                      value={formData?.amount || 0}
                      onChange={(e) =>
                        setFormData({ ...formData!, amount: parseInt(e.target.value) || 0 })
                      }
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Ejemplo: 9900 = $99.00
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Moneda
                    </label>
                    <select
                      value={formData?.currency || 'usd'}
                      onChange={(e) =>
                        setFormData({ ...formData!, currency: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="usd">USD ($)</option>
                      <option value="eur">EUR (€)</option>
                      <option value="mxn">MXN ($)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre del Plan
                    </label>
                    <input
                      type="text"
                      value={formData?.name || ''}
                      onChange={(e) =>
                        setFormData({ ...formData!, name: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                    >
                      {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-700 mb-1">
                      Stripe Price ID (Generado automáticamente):
                    </div>
                    <div className="font-mono text-sm bg-gray-50 p-2 rounded border flex items-center justify-between">
                      {plan.priceId ? (
                        <>
                          <span className="text-green-600 font-semibold">{plan.priceId}</span>
                          <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                            ✓ Sincronizado
                          </span>
                        </>
                      ) : (
                        <span className="text-yellow-600 italic">
                          ⏳ Se creará automáticamente al guardar
                        </span>
                      )}
                    </div>
                    {plan.priceId && (
                      <div className="mt-2 flex gap-2 items-center">
                        <a
                          href={`https://dashboard.stripe.com/prices/${plan.priceId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-700 underline"
                        >
                          Ver en Stripe Dashboard →
                        </a>
                        <span className="text-xs text-gray-400">|</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(plan.priceId);
                            alert('Price ID copiado al portapapeles');
                          }}
                          className="text-xs text-gray-600 hover:text-gray-700 underline"
                        >
                          Copiar ID
                        </button>
                      </div>
                    )}
                    <p className="mt-2 text-xs text-gray-500">
                      💡 Este ID se genera automáticamente cuando guardas la configuración. 
                      El sistema crea el producto y precio en Stripe, luego guarda el ID aquí como referencia.
                    </p>
                  </div>

                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">Características:</div>
                    <ul className="space-y-1">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="text-green-500 mt-1">✓</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => handleEdit(planKey)}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Editar Configuración
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-green-900 mb-2">✨ Sincronización Automática con Stripe</h3>
        <ul className="list-disc list-inside space-y-2 text-green-800">
          <li>
            <strong>Todo es automático:</strong> Al guardar, el sistema crea/actualiza productos y precios en Stripe
          </li>
          <li>
            <strong>Sin pasos manuales:</strong> No necesitas ir a Stripe Dashboard
          </li>
          <li>
            <strong>Cambios de precio:</strong> Si cambias el precio, se crea un nuevo precio en Stripe y se desactiva el anterior
          </li>
          <li>
            <strong>Sincronización en tiempo real:</strong> Los cambios se reflejan inmediatamente en la página pública
          </li>
          <li>
            <strong>Productos reutilizables:</strong> Si el producto ya existe, se reutiliza y solo se crea un nuevo precio si cambia el monto
          </li>
        </ul>
      </div>
    </div>
  );
}

