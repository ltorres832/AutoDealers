'use client';

// Panel de Configuración Completo del Sistema
// Permite activar, desactivar, añadir, quitar, cambiar, cancelar, suspender, visible, no visible

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SystemSettings {
  // Estados de vehículos
  vehicleStates: {
    enabled: boolean;
    allowedStates: string[];
  };
  
  // Purchase Intent
  purchaseIntent: {
    enabled: boolean;
    requireInteraction: boolean;
    minInteractionTime: number; // minutos
    autoVerify: boolean;
    fraudThreshold: number; // score máximo para auto-verificación
  };
  
  // Antifraude
  antifraud: {
    enabled: boolean;
    checkClientCreation: boolean;
    checkIPMatch: boolean;
    checkInteractionTime: boolean;
    checkExternalSales: boolean;
    checkDuplicateVIN: boolean;
    checkMultipleSales: boolean;
    autoFlagThreshold: number;
    autoSuspendThreshold: number;
  };
  
  // Certificados
  certificates: {
    enabled: boolean;
    autoGenerate: boolean;
    includeQR: boolean;
    emailToClient: boolean;
  };
  
  // Roadside Assistance
  roadside: {
    enabled: boolean;
    durationMonths: number;
    autoActivate: boolean;
  };
  
  // Partners
  partners: {
    insurance: {
      enabled: boolean;
      visible: boolean;
      referralFee: number;
    };
    banks: {
      enabled: boolean;
      visible: boolean;
      referralFee: number;
    };
    roadside: {
      enabled: boolean;
      visible: boolean;
      referralFee: number;
    };
  };
  
  // Earnings
  earnings: {
    enabled: boolean;
    visibleToAdmin: boolean;
    autoTrack: boolean;
  };
  
  // Dashboard Admin
  dashboard: {
    showKPIs: boolean;
    showFraudAlerts: boolean;
    showEarnings: boolean;
    showTopDealers: boolean;
  };
}

export default function SystemSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'purchase' | 'fraud' | 'partners' | 'earnings'>('general');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/settings', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings || getDefaultSettings());
      } else {
        setSettings(getDefaultSettings());
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setSettings(getDefaultSettings());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultSettings = (): SystemSettings => ({
    vehicleStates: {
      enabled: true,
      allowedStates: ['AVAILABLE', 'IN_NEGOTIATION', 'SOLD_PENDING_VERIFICATION', 'SOLD_VERIFIED', 'SOLD_EXTERNAL'],
    },
    purchaseIntent: {
      enabled: true,
      requireInteraction: true,
      minInteractionTime: 1,
      autoVerify: false,
      fraudThreshold: 30,
    },
    antifraud: {
      enabled: true,
      checkClientCreation: true,
      checkIPMatch: true,
      checkInteractionTime: true,
      checkExternalSales: true,
      checkDuplicateVIN: true,
      checkMultipleSales: true,
      autoFlagThreshold: 31,
      autoSuspendThreshold: 61,
    },
    certificates: {
      enabled: true,
      autoGenerate: true,
      includeQR: true,
      emailToClient: true,
    },
    roadside: {
      enabled: true,
      durationMonths: 6,
      autoActivate: true,
    },
    partners: {
      insurance: {
        enabled: true,
        visible: false,
        referralFee: 0,
      },
      banks: {
        enabled: true,
        visible: false,
        referralFee: 0,
      },
      roadside: {
        enabled: true,
        visible: false,
        referralFee: 0,
      },
    },
    earnings: {
      enabled: true,
      visibleToAdmin: true,
      autoTrack: true,
    },
    dashboard: {
      showKPIs: true,
      showFraudAlerts: true,
      showEarnings: true,
      showTopDealers: true,
    },
  });

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ settings }),
      });

      if (response.ok) {
        alert('Configuración guardada exitosamente');
      } else {
        const error = await response.json();
        alert(error.error || 'Error al guardar');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (path: string, value: any) => {
    if (!settings) return;

    const keys = path.split('.');
    const newSettings = { ...settings };
    let current: any = newSettings;

    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = { ...current[keys[i]] };
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    setSettings(newSettings);
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Configuración del Sistema</h1>
        <p className="mt-2 text-gray-600">
          Gestiona todas las configuraciones del sistema según el documento maestro
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'general', label: 'General' },
            { id: 'purchase', label: 'Purchase Intent' },
            { id: 'fraud', label: 'Antifraude' },
            { id: 'partners', label: 'Partners' },
            { id: 'earnings', label: 'Earnings' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenido de Tabs */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        {activeTab === 'general' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Configuración General</h2>

            {/* Estados de Vehículos */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Estados de Vehículos</h3>
              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.vehicleStates.enabled}
                    onChange={(e) => updateSettings('vehicleStates.enabled', e.target.checked)}
                    className="mr-3"
                  />
                  <span>Habilitar control de estados de vehículos</span>
                </label>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estados Permitidos
                  </label>
                  <div className="space-y-2">
                    {['AVAILABLE', 'IN_NEGOTIATION', 'SOLD_PENDING_VERIFICATION', 'SOLD_VERIFIED', 'SOLD_EXTERNAL'].map((state) => (
                      <label key={state} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.vehicleStates.allowedStates.includes(state)}
                          onChange={(e) => {
                            const newStates = e.target.checked
                              ? [...settings.vehicleStates.allowedStates, state]
                              : settings.vehicleStates.allowedStates.filter(s => s !== state);
                            updateSettings('vehicleStates.allowedStates', newStates);
                          }}
                          className="mr-3"
                        />
                        <span>{state}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Certificados */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Certificados de Compra</h3>
              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.certificates.enabled}
                    onChange={(e) => updateSettings('certificates.enabled', e.target.checked)}
                    className="mr-3"
                  />
                  <span>Habilitar certificados de compra</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.certificates.autoGenerate}
                    onChange={(e) => updateSettings('certificates.autoGenerate', e.target.checked)}
                    className="mr-3"
                  />
                  <span>Generar automáticamente</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.certificates.includeQR}
                    onChange={(e) => updateSettings('certificates.includeQR', e.target.checked)}
                    className="mr-3"
                  />
                  <span>Incluir código QR</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.certificates.emailToClient}
                    onChange={(e) => updateSettings('certificates.emailToClient', e.target.checked)}
                    className="mr-3"
                  />
                  <span>Enviar por email al cliente</span>
                </label>
              </div>
            </div>

            {/* Roadside */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Roadside Assistance</h3>
              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.roadside.enabled}
                    onChange={(e) => updateSettings('roadside.enabled', e.target.checked)}
                    className="mr-3"
                  />
                  <span>Habilitar Roadside Assistance</span>
                </label>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duración (meses)
                  </label>
                  <input
                    type="number"
                    value={settings.roadside.durationMonths}
                    onChange={(e) => updateSettings('roadside.durationMonths', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    min="1"
                    max="24"
                  />
                </div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.roadside.autoActivate}
                    onChange={(e) => updateSettings('roadside.autoActivate', e.target.checked)}
                    className="mr-3"
                  />
                  <span>Activar automáticamente</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'purchase' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Purchase Intent</h2>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.purchaseIntent.enabled}
                onChange={(e) => updateSettings('purchaseIntent.enabled', e.target.checked)}
                className="mr-3"
              />
              <span>Habilitar sistema de Purchase Intent</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.purchaseIntent.requireInteraction}
                onChange={(e) => updateSettings('purchaseIntent.requireInteraction', e.target.checked)}
                className="mr-3"
              />
              <span>Requerir interacción previa</span>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tiempo mínimo de interacción (minutos)
              </label>
              <input
                type="number"
                value={settings.purchaseIntent.minInteractionTime}
                onChange={(e) => updateSettings('purchaseIntent.minInteractionTime', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="1"
              />
            </div>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.purchaseIntent.autoVerify}
                onChange={(e) => updateSettings('purchaseIntent.autoVerify', e.target.checked)}
                className="mr-3"
              />
              <span>Verificación automática</span>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Umbral de fraude para auto-verificación (0-100)
              </label>
              <input
                type="number"
                value={settings.purchaseIntent.fraudThreshold}
                onChange={(e) => updateSettings('purchaseIntent.fraudThreshold', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="0"
                max="100"
              />
            </div>
          </div>
        )}

        {activeTab === 'fraud' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Sistema Antifraude</h2>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.antifraud.enabled}
                onChange={(e) => updateSettings('antifraud.enabled', e.target.checked)}
                className="mr-3"
              />
              <span>Habilitar sistema antifraude</span>
            </label>

            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.antifraud.checkClientCreation}
                  onChange={(e) => updateSettings('antifraud.checkClientCreation', e.target.checked)}
                  className="mr-3"
                />
                <span>Verificar creación reciente de cliente</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.antifraud.checkIPMatch}
                  onChange={(e) => updateSettings('antifraud.checkIPMatch', e.target.checked)}
                  className="mr-3"
                />
                <span>Verificar coincidencia de IP (dealer/cliente)</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.antifraud.checkInteractionTime}
                  onChange={(e) => updateSettings('antifraud.checkInteractionTime', e.target.checked)}
                  className="mr-3"
                />
                <span>Verificar tiempo de interacción</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.antifraud.checkExternalSales}
                  onChange={(e) => updateSettings('antifraud.checkExternalSales', e.target.checked)}
                  className="mr-3"
                />
                <span>Verificar ventas externas consecutivas</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.antifraud.checkDuplicateVIN}
                  onChange={(e) => updateSettings('antifraud.checkDuplicateVIN', e.target.checked)}
                  className="mr-3"
                />
                <span>Verificar VINs duplicados</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.antifraud.checkMultipleSales}
                  onChange={(e) => updateSettings('antifraud.checkMultipleSales', e.target.checked)}
                  className="mr-3"
                />
                <span>Verificar múltiples ventas del mismo cliente</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Umbral para marcar como flag (0-100)
              </label>
              <input
                type="number"
                value={settings.antifraud.autoFlagThreshold}
                onChange={(e) => updateSettings('antifraud.autoFlagThreshold', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="0"
                max="100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Umbral para suspensión automática (0-100)
              </label>
              <input
                type="number"
                value={settings.antifraud.autoSuspendThreshold}
                onChange={(e) => updateSettings('antifraud.autoSuspendThreshold', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="0"
                max="100"
              />
            </div>
          </div>
        )}

        {activeTab === 'partners' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Partners y Referencias</h2>

            {/* Seguros */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Seguros</h3>
              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.partners.insurance.enabled}
                    onChange={(e) => updateSettings('partners.insurance.enabled', e.target.checked)}
                    className="mr-3"
                  />
                  <span>Habilitar integración con seguros</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.partners.insurance.visible}
                    onChange={(e) => updateSettings('partners.insurance.visible', e.target.checked)}
                    className="mr-3"
                  />
                  <span>Visible para usuarios</span>
                </label>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Referral Fee (%)
                  </label>
                  <input
                    type="number"
                    value={settings.partners.insurance.referralFee}
                    onChange={(e) => updateSettings('partners.insurance.referralFee', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
              </div>
            </div>

            {/* Bancos */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Bancos</h3>
              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.partners.banks.enabled}
                    onChange={(e) => updateSettings('partners.banks.enabled', e.target.checked)}
                    className="mr-3"
                  />
                  <span>Habilitar integración con bancos</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.partners.banks.visible}
                    onChange={(e) => updateSettings('partners.banks.visible', e.target.checked)}
                    className="mr-3"
                  />
                  <span>Visible para usuarios</span>
                </label>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Referral Fee (%)
                  </label>
                  <input
                    type="number"
                    value={settings.partners.banks.referralFee}
                    onChange={(e) => updateSettings('partners.banks.referralFee', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
              </div>
            </div>

            {/* Roadside */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Roadside</h3>
              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.partners.roadside.enabled}
                    onChange={(e) => updateSettings('partners.roadside.enabled', e.target.checked)}
                    className="mr-3"
                  />
                  <span>Habilitar integración con Roadside</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.partners.roadside.visible}
                    onChange={(e) => updateSettings('partners.roadside.visible', e.target.checked)}
                    className="mr-3"
                  />
                  <span>Visible para usuarios</span>
                </label>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Referral Fee (%)
                  </label>
                  <input
                    type="number"
                    value={settings.partners.roadside.referralFee}
                    onChange={(e) => updateSettings('partners.roadside.referralFee', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'earnings' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Earnings y Dashboard</h2>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.earnings.enabled}
                onChange={(e) => updateSettings('earnings.enabled', e.target.checked)}
                className="mr-3"
              />
              <span>Habilitar sistema de earnings</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.earnings.visibleToAdmin}
                onChange={(e) => updateSettings('earnings.visibleToAdmin', e.target.checked)}
                className="mr-3"
              />
              <span>Visible solo para Admin</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.earnings.autoTrack}
                onChange={(e) => updateSettings('earnings.autoTrack', e.target.checked)}
                className="mr-3"
              />
              <span>Tracking automático de earnings</span>
            </label>

            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Dashboard Admin</h3>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.dashboard.showKPIs}
                    onChange={(e) => updateSettings('dashboard.showKPIs', e.target.checked)}
                    className="mr-3"
                  />
                  <span>Mostrar KPIs</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.dashboard.showFraudAlerts}
                    onChange={(e) => updateSettings('dashboard.showFraudAlerts', e.target.checked)}
                    className="mr-3"
                  />
                  <span>Mostrar alertas de fraude</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.dashboard.showEarnings}
                    onChange={(e) => updateSettings('dashboard.showEarnings', e.target.checked)}
                    className="mr-3"
                  />
                  <span>Mostrar earnings</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.dashboard.showTopDealers}
                    onChange={(e) => updateSettings('dashboard.showTopDealers', e.target.checked)}
                    className="mr-3"
                  />
                  <span>Mostrar top dealers</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Botón Guardar */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Guardando...' : '✓ Guardar Configuración'}
        </button>
      </div>
    </div>
  );
}
