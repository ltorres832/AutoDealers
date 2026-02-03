'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Promotion {
  id: string;
  name: string;
  description: string;
  type: string;
  discount?: {
    type: 'percentage' | 'fixed';
    value: number;
  };
  status: string;
  startDate: string;
  endDate?: string;
  isPaid?: boolean;
  price?: number;
  duration?: number;
  placement?: string;
  imageUrl?: string;
  views?: number;
  clicks?: number;
  priority?: number;
  createdAt?: string;
}

export default function InternalPromotionsPage() {
  const router = useRouter();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchPromotions();
  }, []);

  async function fetchPromotions() {
    try {
      const response = await fetch('/api/admin/internal-promotions');
      if (response.ok) {
        const data = await response.json();
        setPromotions(data.promotions || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deletePromotion(id: string) {
    if (!confirm('¿Estás seguro de eliminar esta promoción interna?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/internal-promotions/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Promoción eliminada exitosamente');
        fetchPromotions();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Error al eliminar promoción'}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
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
          <h1 className="text-3xl font-bold">Promociones Internas de la Plataforma</h1>
          <p className="text-gray-600 mt-2">
            Crea y gestiona promociones internas de la plataforma. Gratis o con costo.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium"
        >
          ➕ Crear Promoción Interna
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Total</div>
          <div className="text-2xl font-bold">{promotions.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Activas</div>
          <div className="text-2xl font-bold text-green-600">
            {promotions.filter(p => p.status === 'active').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Vistas Totales</div>
          <div className="text-2xl font-bold text-blue-600">
            {promotions.reduce((sum, p) => sum + (p.views || 0), 0)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Clics Totales</div>
          <div className="text-2xl font-bold text-purple-600">
            {promotions.reduce((sum, p) => sum + (p.clicks || 0), 0)}
          </div>
        </div>
      </div>

      {/* Lista de Promociones */}
      {promotions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-xl font-bold mb-2">No hay promociones internas</h3>
          <p className="text-gray-600 mb-4">
            Crea tu primera promoción interna de la plataforma
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium"
          >
            Crear Promoción
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {promotions.map((promotion) => (
            <div
              key={promotion.id}
              className="bg-white rounded-lg shadow-lg overflow-hidden"
            >
              {promotion.imageUrl && (
                <div className="relative h-48 bg-gray-200">
                  <img
                    src={promotion.imageUrl}
                    alt={promotion.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <span className="px-3 py-1 bg-green-600 text-white rounded-full text-xs font-bold">
                      INTERNA
                    </span>
                  </div>
                </div>
              )}
              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-bold">{promotion.name}</h3>
                  <span
                    className={`px-3 py-1 rounded text-xs ${
                      promotion.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {promotion.status === 'active' ? 'Activa' : promotion.status}
                  </span>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{promotion.description}</p>

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

                <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
                  <div>
                    <div className="text-gray-500">Vistas</div>
                    <div className="font-bold text-blue-600">{promotion.views || 0}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Clics</div>
                    <div className="font-bold text-purple-600">{promotion.clicks || 0}</div>
                  </div>
                </div>

                {promotion.placement && (
                  <div className="mb-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                      📍 {promotion.placement.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                )}

                <div className="text-xs text-gray-500 mb-4">
                  <p>Inicio: {new Date(promotion.startDate).toLocaleDateString()}</p>
                  {promotion.endDate && (
                    <p>Fin: {new Date(promotion.endDate).toLocaleDateString()}</p>
                  )}
                  {promotion.isPaid && (
                    <p className="text-yellow-600 font-semibold mt-1">
                      💰 Precio: ${promotion.price || 0}
                    </p>
                  )}
                  {!promotion.isPaid && (
                    <p className="text-green-600 font-semibold mt-1">🆓 GRATIS</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      router.push(`/admin/internal-promotions/${promotion.id}/edit`);
                    }}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-medium"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => deletePromotion(promotion.id)}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm font-medium"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreatePromotionModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchPromotions();
          }}
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
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'discount',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 0,
    startDate: '',
    endDate: '',
    status: 'active',
    isPaid: false,
    price: 0,
    duration: 30,
    placement: 'promotions_section' as 'hero' | 'sidebar' | 'sponsors_section' | 'between_content' | 'promotions_section',
    priority: 100,
    imageUrl: '',
  });

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen');
      return;
    }

    setImageFile(file);
    setUploading(true);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('type', 'promotion');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (response.ok) {
        const data = await response.json();
        setFormData({ ...formData, imageUrl: data.url });
        setImagePreview(URL.createObjectURL(file));
      } else {
        alert('Error al subir imagen');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al subir imagen');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/internal-promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          isInternal: true,
          createdByAdmin: true,
          applicableToAll: true,
          autoSendToLeads: false,
          autoSendToCustomers: false,
          channels: [],
          aiGenerated: false,
          views: 0,
          clicks: 0,
          expiresAt: formData.endDate || undefined,
        }),
      });

      if (response.ok) {
        alert('✅ Promoción interna creada exitosamente');
        onSuccess();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Error al crear promoción'}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-2xl font-bold">Crear Promoción Interna</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Información Básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nombre *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Tipo *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="discount">Descuento</option>
                <option value="special">Especial</option>
                <option value="clearance">Liquidación</option>
                <option value="seasonal">Estacional</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Descripción *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border rounded px-3 py-2"
              rows={3}
              required
            />
          </div>

          {/* Descuento */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-4">Descuento (Opcional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Tipo de Descuento</label>
                <select
                  value={formData.discountType}
                  onChange={(e) => setFormData({ ...formData, discountType: e.target.value as 'percentage' | 'fixed' })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="percentage">Porcentaje (%)</option>
                  <option value="fixed">Monto Fijo ($)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Valor del Descuento</label>
                <input
                  type="number"
                  value={formData.discountValue}
                  onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) || 0 })}
                  className="w-full border rounded px-3 py-2"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Fecha de Inicio *</label>
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
          </div>

          {/* Imagen */}
          <div>
            <label className="block text-sm font-medium mb-2">Imagen de la Promoción</label>
            {imagePreview && (
              <div className="mb-4">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-w-full h-48 object-cover rounded"
                />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full border rounded px-3 py-2"
              disabled={uploading}
            />
            {uploading && <p className="text-sm text-gray-500 mt-2">Subiendo imagen...</p>}
          </div>

          {/* Ubicación y Configuración */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-4">Ubicación y Configuración</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Ubicación *</label>
                <select
                  value={formData.placement}
                  onChange={(e) => setFormData({ ...formData, placement: e.target.value as any })}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="promotions_section">Sección de Promociones</option>
                  <option value="hero">Hero Banner</option>
                  <option value="sidebar">Sidebar</option>
                  <option value="sponsors_section">Sección Patrocinadores</option>
                  <option value="between_content">Entre Contenido</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Prioridad</label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 100 })}
                  className="w-full border rounded px-3 py-2"
                  min="1"
                  max="1000"
                />
                <p className="text-xs text-gray-500 mt-1">Mayor número = más arriba</p>
              </div>
            </div>
          </div>

          {/* Costo */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-4">Costo</h3>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isPaid}
                  onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked, price: e.target.checked ? formData.price : 0 })}
                  className="w-4 h-4"
                />
                <span>Promoción con costo</span>
              </label>
              {formData.isPaid && (
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">Precio ($)</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded px-3 py-2"
                    min="0"
                    step="0.01"
                  />
                </div>
              )}
            </div>
            {!formData.isPaid && (
              <p className="text-sm text-green-600 mt-2">✅ Esta promoción será GRATIS</p>
            )}
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium mb-2">Estado *</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
            >
              <option value="active">Activa</option>
              <option value="scheduled">Programada</option>
              <option value="paused">Pausada</option>
            </select>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
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



