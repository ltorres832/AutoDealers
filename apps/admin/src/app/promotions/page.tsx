'use client';

import { useState, useEffect } from 'react';

interface Promotion {
  id: string;
  name: string;
  description: string;
  type: string;
  discount?: {
    type: 'percentage' | 'fixed';
    value: number;
  };
  startDate: string;
  endDate?: string;
  status: string;
  autoSendToLeads: boolean;
  autoSendToCustomers: boolean;
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchPromotions();
  }, []);

  async function fetchPromotions() {
    try {
      const response = await fetch('/api/promotions');
      const data = await response.json();
      setPromotions(data.promotions || []);
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
          <h1 className="text-3xl font-bold">Promociones y Ofertas</h1>
          <p className="text-gray-600 mt-2">
            Crea promociones que se sincronizarán automáticamente con el CRM y la IA
            para enviar ofertas a tus leads y clientes.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium"
        >
          + Nueva Promoción
        </button>
      </div>

      {promotions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">🎁</div>
          <h2 className="text-xl font-bold mb-2">No hay promociones creadas</h2>
          <p className="text-gray-600 mb-6">
            Crea tu primera promoción para empezar a generar más ventas
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700"
          >
            Crear Primera Promoción
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {promotions.map((promotion) => (
            <div
              key={promotion.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold">{promotion.name}</h3>
                <span
                  className={`px-3 py-1 rounded text-xs ${
                    promotion.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {promotion.status === 'active' ? 'Activa' : 'Inactiva'}
                </span>
              </div>

              <p className="text-gray-600 text-sm mb-4">{promotion.description}</p>

              {promotion.discount && (
                <div className="bg-primary-50 p-3 rounded mb-4">
                  <p className="text-sm text-gray-600">Descuento</p>
                  <p className="text-2xl font-bold text-primary-600">
                    {promotion.discount.type === 'percentage'
                      ? `${promotion.discount.value}%`
                      : `$${promotion.discount.value}`}
                  </p>
                </div>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  {promotion.autoSendToLeads && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                      Envía a Leads
                    </span>
                  )}
                  {promotion.autoSendToCustomers && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                      Envía a Clientes
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Inicio: {new Date(promotion.startDate).toLocaleDateString()}
                </p>
                {promotion.endDate && (
                  <p className="text-xs text-gray-500">
                    Fin: {new Date(promotion.endDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreatePromotionModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchPromotions}
        />
      )}
    </div>
  );
}

function CreatePromotionModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'discount',
    discount: {
      type: 'percentage' as 'percentage' | 'fixed',
      value: '',
    },
    applicableToAll: true,
    startDate: '',
    endDate: '',
    autoSendToLeads: true,
    autoSendToCustomers: false,
    channels: ['whatsapp'] as string[],
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          type: formData.type,
          discount: formData.discount.value
            ? {
                type: formData.discount.type,
                value: parseFloat(formData.discount.value),
              }
            : undefined,
          applicableToAll: formData.applicableToAll,
          startDate: new Date(formData.startDate),
          endDate: formData.endDate ? new Date(formData.endDate) : undefined,
          status: 'active',
          autoSendToLeads: formData.autoSendToLeads,
          autoSendToCustomers: formData.autoSendToCustomers,
          channels: formData.channels,
          aiGenerated: false,
        }),
      });

      if (response.ok) {
        onClose();
        onSuccess();
      } else {
        alert('Error al crear promoción');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear promoción');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Nueva Promoción</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nombre</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Descripción</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border rounded px-3 py-2"
              rows={3}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Tipo</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="discount">Descuento</option>
              <option value="special">Especial</option>
              <option value="clearance">Liquidación</option>
              <option value="seasonal">Estacional</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Descuento</label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={formData.discount.type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    discount: { ...formData.discount, type: e.target.value as any },
                  })
                }
                className="border rounded px-3 py-2"
              >
                <option value="percentage">Porcentaje</option>
                <option value="fixed">Monto Fijo</option>
              </select>
              <input
                type="number"
                value={formData.discount.value}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    discount: { ...formData.discount, value: e.target.value },
                  })
                }
                className="border rounded px-3 py-2"
                placeholder={formData.discount.type === 'percentage' ? '10' : '1000'}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Fecha de Inicio</label>
            <input
              type="datetime-local"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Fecha de Fin (Opcional)</label>
            <input
              type="datetime-local"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.autoSendToLeads}
                onChange={(e) =>
                  setFormData({ ...formData, autoSendToLeads: e.target.checked })
                }
              />
              <span className="text-sm">Enviar automáticamente a leads sin compra</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.autoSendToCustomers}
                onChange={(e) =>
                  setFormData({ ...formData, autoSendToCustomers: e.target.checked })
                }
              />
              <span className="text-sm">Enviar automáticamente a clientes</span>
            </label>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              {loading ? 'Creando...' : 'Crear Promoción'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}





