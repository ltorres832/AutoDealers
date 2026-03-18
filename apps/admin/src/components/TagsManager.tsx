'use client';

import { useState, useEffect } from 'react';

interface Tag {
  id: string;
  tenantId: string;
  name: string;
  color: string;
  description?: string;
  autoApply?: boolean;
}

interface TagsManagerProps {
  tenantId?: string;
}

export default function TagsManager({ tenantId }: TagsManagerProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadTags();
  }, [tenantId]);

  async function loadTags() {
    try {
      setLoading(true);
      const params = tenantId ? `?tenantId=${tenantId}` : '';
      const response = await fetch(`/api/admin/tags${params}`, {
        credentials: 'include',
      });
      const data = await response.json();
      setTags(data.tags || []);
    } catch (error) {
      console.error('Error loading tags:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteTag(tagId: string) {
    if (!confirm('¿Estás seguro de eliminar esta etiqueta? Se removerá de todos los leads.')) return;

    try {
      const params = new URLSearchParams();
      if (tenantId) params.append('tenantId', tenantId);
      
      const response = await fetch(`/api/admin/tags/${tagId}?${params}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setTags((prev) => prev.filter((t) => t.id !== tagId));
      }
    } catch (error) {
      console.error('Error deleting tag:', error);
      alert('Error al eliminar la etiqueta');
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
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Gestión de Etiquetas</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700"
        >
          Nueva Etiqueta
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {tags.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No hay etiquetas creadas. Crea tu primera etiqueta para comenzar.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    ></div>
                    <h3 className="font-medium">{tag.name}</h3>
                  </div>
                  <button
                    onClick={() => deleteTag(tag.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Eliminar
                  </button>
                </div>
                {tag.description && (
                  <p className="text-sm text-gray-500 mb-2">{tag.description}</p>
                )}
                {tag.autoApply && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    Aplicación automática
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateTagModal
          tenantId={tenantId}
          onClose={() => {
            setShowCreateModal(false);
            loadTags();
          }}
        />
      )}
    </div>
  );
}

function CreateTagModal({
  tenantId,
  onClose,
}: {
  tenantId?: string;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    color: '#3b82f6',
    description: '',
    autoApply: false,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const response = await fetch('/api/admin/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tenantId,
          tag: formData,
        }),
      });

      if (response.ok) {
        onClose();
      } else {
        throw new Error('Error al crear etiqueta');
      }
    } catch (error) {
      console.error('Error creating tag:', error);
      alert('Error al crear la etiqueta');
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Nueva Etiqueta</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="h-10 w-20 border rounded"
              />
              <input
                type="text"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="flex-1 border rounded px-3 py-2"
                placeholder="#3b82f6"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Descripción (opcional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border rounded px-3 py-2"
              rows={3}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.autoApply}
              onChange={(e) => setFormData({ ...formData, autoApply: e.target.checked })}
              className="mr-2"
            />
            <label className="text-sm">Aplicación automática basada en reglas</label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              Crear Etiqueta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
