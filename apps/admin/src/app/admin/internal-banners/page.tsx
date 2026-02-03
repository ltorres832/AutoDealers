'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Banner {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  ctaText: string;
  linkType: 'vehicle' | 'dealer' | 'seller' | 'filter' | 'url' | 'none';
  linkValue: string;
  status: 'active' | 'paused' | 'expired';
  placement: 'hero' | 'sidebar' | 'sponsors_section' | 'between_content';
  isPaid?: boolean;
  price?: number;
  duration?: number;
  views: number;
  clicks: number;
  priority?: number;
  expiresAt?: string;
  createdAt?: string;
}

export default function InternalBannersPage() {
  const router = useRouter();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchBanners();
  }, []);

  async function fetchBanners() {
    try {
      const response = await fetch('/api/admin/internal-banners');
      if (response.ok) {
        const data = await response.json();
        setBanners(data.banners || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteBanner(id: string) {
    if (!confirm('¿Estás seguro de eliminar este banner interno?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/internal-banners/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Banner eliminado exitosamente');
        fetchBanners();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Error al eliminar banner'}`);
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
          <h1 className="text-3xl font-bold">Banners Internos de la Plataforma</h1>
          <p className="text-gray-600 mt-2">
            Crea y gestiona banners internos de la plataforma. Gratis o con costo. Cualquier espacio disponible.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium"
        >
          ➕ Crear Banner Interno
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Total</div>
          <div className="text-2xl font-bold">{banners.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Activos</div>
          <div className="text-2xl font-bold text-green-600">
            {banners.filter(b => b.status === 'active').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Vistas Totales</div>
          <div className="text-2xl font-bold text-blue-600">
            {banners.reduce((sum, b) => sum + (b.views || 0), 0)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Clics Totales</div>
          <div className="text-2xl font-bold text-purple-600">
            {banners.reduce((sum, b) => sum + (b.clicks || 0), 0)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">CTR Promedio</div>
          <div className="text-2xl font-bold text-indigo-600">
            {banners.length > 0
              ? ((banners.reduce((sum, b) => sum + (b.clicks || 0), 0) /
                  banners.reduce((sum, b) => sum + (b.views || 0), 1)) * 100).toFixed(2)
              : '0.00'}%
          </div>
        </div>
      </div>

      {/* Banners por Ubicación */}
      {['hero', 'sidebar', 'sponsors_section', 'between_content'].map((placement) => {
        const placementBanners = banners.filter(b => b.placement === placement);
        if (placementBanners.length === 0) return null;

        return (
          <div key={placement} className="mb-8">
            <h2 className="text-xl font-bold mb-4 capitalize">
              {placement.replace('_', ' ').toUpperCase()} ({placementBanners.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {placementBanners.map((banner) => (
                <div
                  key={banner.id}
                  className="bg-white rounded-lg shadow-lg overflow-hidden"
                >
                  <div className="relative h-48 bg-gray-200">
                    <img
                      src={banner.imageUrl}
                      alt={banner.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 flex gap-2">
                      <span className="px-3 py-1 bg-green-600 text-white rounded-full text-xs font-bold">
                        INTERNO
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          banner.status === 'active'
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-500 text-white'
                        }`}
                      >
                        {banner.status === 'active' ? 'Activo' : banner.status}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2">{banner.title}</h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{banner.description}</p>

                    <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
                      <div>
                        <div className="text-gray-500">Vistas</div>
                        <div className="font-bold text-blue-600">{banner.views || 0}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Clics</div>
                        <div className="font-bold text-purple-600">{banner.clicks || 0}</div>
                      </div>
                    </div>

                    {banner.priority && (
                      <div className="mb-3">
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">
                          🎯 Prioridad: {banner.priority}
                        </span>
                      </div>
                    )}

                    <div className="text-xs text-gray-500 mb-4">
                      {banner.isPaid ? (
                        <p className="text-yellow-600 font-semibold">
                          💰 Precio: ${banner.price || 0} / Duración: {banner.duration || 0} días
                        </p>
                      ) : (
                        <p className="text-green-600 font-semibold">🆓 GRATIS</p>
                      )}
                      {banner.expiresAt && (
                        <p>Expira: {new Date(banner.expiresAt).toLocaleDateString()}</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          router.push(`/admin/internal-banners/${banner.id}/edit`);
                        }}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-medium"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => deleteBanner(banner.id)}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm font-medium"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {banners.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">🎨</div>
          <h3 className="text-xl font-bold mb-2">No hay banners internos</h3>
          <p className="text-gray-600 mb-4">
            Crea tu primer banner interno de la plataforma
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium"
          >
            Crear Banner
          </button>
        </div>
      )}

      {showCreateModal && (
        <CreateBannerModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchBanners();
          }}
        />
      )}
    </div>
  );
}

function CreateBannerModal({
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
    title: '',
    description: '',
    ctaText: 'Ver Más',
    linkType: 'none' as 'vehicle' | 'dealer' | 'seller' | 'filter' | 'url' | 'none',
    linkValue: '',
    status: 'active' as 'active' | 'paused' | 'expired',
    placement: 'hero' as 'hero' | 'sidebar' | 'sponsors_section' | 'between_content',
    isPaid: false,
    price: 0,
    duration: 30,
    priority: 100,
    imageUrl: '',
  });

  const placementSpecs = {
    hero: { width: 1920, height: 600, aspectRatio: '16:5' },
    sidebar: { width: 300, height: 250, aspectRatio: '6:5' },
    sponsors_section: { width: 400, height: 300, aspectRatio: '4:3' },
    between_content: { width: 728, height: 90, aspectRatio: '728:90' },
  };

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen');
      return;
    }

    const specs = placementSpecs[formData.placement];
    if (file.size > 5 * 1024 * 1024) {
      alert('El archivo es demasiado grande. Tamaño máximo: 5MB');
      return;
    }

    setImageFile(file);
    setUploading(true);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('type', 'banner');

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
      const expiresAt = formData.isPaid && formData.duration
        ? new Date(Date.now() + formData.duration * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

      const response = await fetch('/api/admin/internal-banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          isInternal: true,
          createdByAdmin: true,
          approved: true, // Admin banners auto-aprobados
          views: 0,
          clicks: 0,
          expiresAt,
        }),
      });

      if (response.ok) {
        alert('✅ Banner interno creado exitosamente');
        onSuccess();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Error al crear banner'}`);
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
          <h2 className="text-2xl font-bold">Crear Banner Interno</h2>
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
              <label className="block text-sm font-medium mb-2">Título *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Ubicación *</label>
              <select
                value={formData.placement}
                onChange={(e) => setFormData({ ...formData, placement: e.target.value as any })}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="hero">Hero Banner (1920x600px)</option>
                <option value="sidebar">Sidebar (300x250px)</option>
                <option value="sponsors_section">Sección Patrocinadores (400x300px)</option>
                <option value="between_content">Entre Contenido (728x90px)</option>
              </select>
              {placementSpecs[formData.placement] && (
                <p className="text-xs text-gray-500 mt-1">
                  Dimensiones: {placementSpecs[formData.placement].width}x{placementSpecs[formData.placement].height}px
                  {' '}({placementSpecs[formData.placement].aspectRatio})
                </p>
              )}
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

          {/* Imagen */}
          <div>
            <label className="block text-sm font-medium mb-2">Imagen del Banner *</label>
            {imagePreview && (
              <div className="mb-4">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-w-full h-64 object-contain rounded border"
                />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full border rounded px-3 py-2"
              disabled={uploading}
              required={!formData.imageUrl}
            />
            {uploading && <p className="text-sm text-gray-500 mt-2">Subiendo imagen...</p>}
            {placementSpecs[formData.placement] && (
              <p className="text-xs text-gray-500 mt-2">
                Tamaño recomendado: {placementSpecs[formData.placement].width}x{placementSpecs[formData.placement].height}px
              </p>
            )}
          </div>

          {/* Link */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Tipo de Enlace</label>
              <select
                value={formData.linkType}
                onChange={(e) => setFormData({ ...formData, linkType: e.target.value as any, linkValue: '' })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="none">Sin Enlace</option>
                <option value="url">URL Externa</option>
                <option value="vehicle">Vehículo</option>
                <option value="dealer">Dealer</option>
                <option value="seller">Vendedor</option>
                <option value="filter">Filtro</option>
              </select>
            </div>
            {formData.linkType !== 'none' && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  {formData.linkType === 'url' ? 'URL' :
                   formData.linkType === 'vehicle' ? 'ID de Vehículo' :
                   formData.linkType === 'filter' ? 'JSON de Filtro' :
                   'ID o Valor'}
                </label>
                <input
                  type="text"
                  value={formData.linkValue}
                  onChange={(e) => setFormData({ ...formData, linkValue: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder={
                    formData.linkType === 'url' ? 'https://...' :
                    formData.linkType === 'filter' ? '{"make": "Toyota"}' :
                    'ID o valor'
                  }
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Texto del Botón (CTA)</label>
            <input
              type="text"
              value={formData.ctaText}
              onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="Ver Más"
            />
          </div>

          {/* Prioridad y Costo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-medium mb-2">Estado *</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="active">Activo</option>
                <option value="paused">Pausado</option>
              </select>
            </div>
          </div>

          {/* Costo */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-4">Costo</h3>
            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isPaid}
                  onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked, price: e.target.checked ? formData.price : 0 })}
                  className="w-4 h-4"
                />
                <span>Banner con costo</span>
              </label>
            </div>
            {formData.isPaid && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
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
                <div>
                  <label className="block text-sm font-medium mb-2">Duración (días)</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 30 })}
                    className="w-full border rounded px-3 py-2"
                    min="1"
                  />
                </div>
              </div>
            )}
            {!formData.isPaid && (
              <p className="text-sm text-green-600">✅ Este banner será GRATIS</p>
            )}
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
              disabled={loading || !formData.imageUrl}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear Banner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



