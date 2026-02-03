'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Campaign {
  id: string;
  name: string;
  type: string;
  platforms: string[];
  status: string;
  budgets: Array<{ platform: string; amount: number; currency: string }>;
  metrics?: {
    impressions: number;
    clicks: number;
    leads: number;
    spend: number;
  };
  createdAt: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  async function fetchCampaigns() {
    try {
      const response = await fetch('/api/campaigns');
      const data = await response.json();
      setCampaigns(data.campaigns || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
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
          <h1 className="text-3xl font-bold">Campañas de Publicidad</h1>
          <p className="text-gray-600 mt-2">
            Crea y gestiona todas tus campañas desde un solo lugar. La IA te ayudará
            a crear contenido y optimizar tus campañas.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium"
        >
          + Nueva Campaña
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">📢</div>
          <h2 className="text-xl font-bold mb-2">No hay campañas creadas</h2>
          <p className="text-gray-600 mb-6">
            Crea tu primera campaña para empezar a generar más leads
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700"
          >
            Crear Primera Campaña
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/campaigns/${campaign.id}`}
              className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold">{campaign.name}</h3>
                <span
                  className={`px-3 py-1 rounded text-xs ${
                    campaign.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : campaign.status === 'paused'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {campaign.status === 'active' ? 'Activa' : campaign.status === 'paused' ? 'Pausada' : 'Borrador'}
                </span>
              </div>

              <div className="mb-4">
                <div className="flex gap-2 flex-wrap">
                  {campaign.platforms.map((platform) => (
                    <span
                      key={platform}
                      className="px-2 py-1 bg-gray-100 rounded text-xs capitalize"
                    >
                      {platform}
                    </span>
                  ))}
                </div>
              </div>

              {campaign.metrics && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Impresiones</p>
                    <p className="font-bold">{campaign.metrics.impressions.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Clics</p>
                    <p className="font-bold">{campaign.metrics.clicks.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Leads</p>
                    <p className="font-bold">{campaign.metrics.leads}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Gastado</p>
                    <p className="font-bold">
                      ${campaign.metrics.spend.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-gray-500">
                  Presupuesto total:{' '}
                  <span className="font-medium">
                    {campaign.budgets
                      .reduce((sum, b) => sum + b.amount, 0)
                      .toLocaleString()}{' '}
                    {campaign.budgets[0]?.currency || 'USD'}
                  </span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateCampaignModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchCampaigns}
        />
      )}
    </div>
  );
}

function CreateCampaignModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'promotion',
    platforms: [] as string[],
    budgets: [] as Array<{ platform: string; amount: string; currency: string; dailyLimit?: string }>,
    content: {
      text: '',
      images: [] as string[],
      videos: [] as string[],
      callToAction: '',
      link: '',
    },
    schedule: {
      startDate: '',
      endDate: '',
    },
    useAI: true,
  });
  const [loading, setLoading] = useState(false);
  const [integrations, setIntegrations] = useState<any[]>([]);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  async function fetchIntegrations() {
    const response = await fetch('/api/integrations');
    const data = await response.json();
    setIntegrations(data.integrations || []);
  }

  async function generateContentWithAI() {
    if (!formData.name || !formData.description) {
      alert('Completa nombre y descripción primero');
      return;
    }

    try {
      const response = await fetch('/api/ai/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'campaign',
          context: `${formData.name}. ${formData.description}`,
        }),
      });

      const data = await response.json();
      if (data.content) {
        setFormData({
          ...formData,
          content: { ...formData.content, text: data.content },
        });
      }
    } catch (error) {
      console.error('Error generating content:', error);
    }
  }

  async function handleSubmit() {
    setLoading(true);

    try {
      const budgets = formData.budgets
        .filter((b) => b.platform && b.amount)
        .map((b) => ({
          platform: b.platform,
          amount: parseFloat(b.amount),
          currency: b.currency || 'USD',
          dailyLimit: b.dailyLimit ? parseFloat(b.dailyLimit) : undefined,
        }));

      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          type: formData.type,
          platforms: formData.platforms,
          budgets,
          content: formData.content,
          schedule: {
            startDate: formData.schedule.startDate
              ? new Date(formData.schedule.startDate)
              : new Date(),
            endDate: formData.schedule.endDate
              ? new Date(formData.schedule.endDate)
              : undefined,
          },
          status: 'draft',
          aiGenerated: formData.useAI,
        }),
      });

      if (response.ok) {
        onClose();
        onSuccess();
      } else {
        alert('Error al crear campaña');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear campaña');
    } finally {
      setLoading(false);
    }
  }

  function addBudget() {
    setFormData({
      ...formData,
      budgets: [
        ...formData.budgets,
        { platform: '', amount: '', currency: 'USD' },
      ],
    });
  }

  function updateBudget(index: number, updates: any) {
    const newBudgets = [...formData.budgets];
    newBudgets[index] = { ...newBudgets[index], ...updates };
    setFormData({ ...formData, budgets: newBudgets });
  }

  const availablePlatforms = integrations
    .filter((i) => i.status === 'active')
    .map((i) => i.platform);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Nueva Campaña</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>
          <div className="flex gap-2 mt-4">
            {[1, 2, 3, 4].map((s) => (
              <button
                key={s}
                onClick={() => setStep(s)}
                className={`px-4 py-2 rounded ${
                  step === s
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {s === 1 ? 'Básico' : s === 2 ? 'Plataformas' : s === 3 ? 'Contenido' : 'Programar'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nombre de la Campaña</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Ej: Promoción de Verano 2024"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={4}
                  placeholder="Describe el objetivo de esta campaña..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tipo</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="promotion">Promoción</option>
                  <option value="awareness">Conciencia de Marca</option>
                  <option value="conversion">Conversión</option>
                  <option value="engagement">Engagement</option>
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Plataformas</label>
                <div className="space-y-2">
                  {availablePlatforms.map((platform) => (
                    <label key={platform} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.platforms.includes(platform)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              platforms: [...formData.platforms, platform],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              platforms: formData.platforms.filter((p) => p !== platform),
                            });
                          }
                        }}
                      />
                      <span className="capitalize">{platform}</span>
                    </label>
                  ))}
                </div>
                {availablePlatforms.length === 0 && (
                  <p className="text-sm text-yellow-600">
                    No hay plataformas conectadas. Ve a Configuración → Integraciones para conectar.
                  </p>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium">Presupuestos</label>
                  <button
                    onClick={addBudget}
                    className="text-primary-600 hover:text-primary-700 text-sm"
                  >
                    + Agregar Presupuesto
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.budgets.map((budget, index) => (
                    <div key={index} className="grid grid-cols-4 gap-2">
                      <select
                        value={budget.platform}
                        onChange={(e) => updateBudget(index, { platform: e.target.value })}
                        className="border rounded px-3 py-2"
                      >
                        <option value="">Plataforma</option>
                        {formData.platforms.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={budget.amount}
                        onChange={(e) => updateBudget(index, { amount: e.target.value })}
                        placeholder="Monto"
                        className="border rounded px-3 py-2"
                      />
                      <select
                        value={budget.currency}
                        onChange={(e) => updateBudget(index, { currency: e.target.value })}
                        className="border rounded px-3 py-2"
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="MXN">MXN</option>
                      </select>
                      <input
                        type="number"
                        value={budget.dailyLimit || ''}
                        onChange={(e) => updateBudget(index, { dailyLimit: e.target.value })}
                        placeholder="Límite diario"
                        className="border rounded px-3 py-2"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium">Contenido</label>
                <button
                  onClick={generateContentWithAI}
                  className="text-primary-600 hover:text-primary-700 text-sm"
                >
                  ✨ Generar con IA
                </button>
              </div>
              <textarea
                value={formData.content.text}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    content: { ...formData.content, text: e.target.value },
                  })
                }
                className="w-full border rounded px-3 py-2"
                rows={6}
                placeholder="Escribe el contenido de tu campaña..."
              />
              <div>
                <label className="block text-sm font-medium mb-2">Call to Action</label>
                <input
                  type="text"
                  value={formData.content.callToAction}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      content: { ...formData.content, callToAction: e.target.value },
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                  placeholder="Ej: Ver más, Comprar ahora, Solicitar información"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Link</label>
                <input
                  type="url"
                  value={formData.content.link}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      content: { ...formData.content, link: e.target.value },
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                  placeholder="https://..."
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Fecha de Inicio</label>
                <input
                  type="datetime-local"
                  value={formData.schedule.startDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      schedule: { ...formData.schedule, startDate: e.target.value },
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Fecha de Fin (Opcional)</label>
                <input
                  type="datetime-local"
                  value={formData.schedule.endDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      schedule: { ...formData.schedule, endDate: e.target.value },
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.useAI}
                  onChange={(e) => setFormData({ ...formData, useAI: e.target.checked })}
                />
                <span className="text-sm">Usar IA para optimizar la campaña</span>
              </label>
            </div>
          )}
        </div>

        <div className="p-6 border-t flex justify-between">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Anterior
          </button>
          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              Siguiente
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              {loading ? 'Creando...' : 'Crear Campaña'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}





