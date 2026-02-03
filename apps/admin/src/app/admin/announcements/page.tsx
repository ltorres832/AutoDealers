'use client';

import { useState, useEffect } from 'react';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'announcement';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  targetDashboards: ('admin' | 'dealer' | 'seller' | 'public')[];
  targetRoles?: ('admin' | 'dealer' | 'seller' | 'advertiser')[];
  targetTenants?: string[];
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  showDismissButton: boolean;
  actionUrl?: string;
  actionText?: string;
  createdAt: string;
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState<Partial<Announcement>>({
    title: '',
    message: '',
    type: 'info',
    priority: 'medium',
    targetDashboards: ['admin', 'dealer', 'seller', 'public'],
    isActive: true,
    showDismissButton: true,
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  async function fetchAnnouncements() {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/announcements', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      const url = editingAnnouncement
        ? '/api/admin/announcements'
        : '/api/admin/announcements';
      const method = editingAnnouncement ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...(editingAnnouncement && { id: editingAnnouncement.id }),
          ...formData,
        }),
      });

      if (response.ok) {
        alert(editingAnnouncement ? 'Anuncio actualizado' : 'Anuncio creado');
        setShowModal(false);
        setEditingAnnouncement(null);
        setFormData({
          title: '',
          message: '',
          type: 'info',
          priority: 'medium',
          targetDashboards: ['admin', 'dealer', 'seller', 'public'],
          isActive: true,
          showDismissButton: true,
        });
        await fetchAnnouncements();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al guardar anuncio');
      }
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Error: ${error.message || 'Error desconocido'}`);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de eliminar este anuncio?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/announcements?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        alert('Anuncio eliminado');
        await fetchAnnouncements();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al eliminar anuncio');
      }
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Error: ${error.message || 'Error desconocido'}`);
    }
  }

  function handleEdit(announcement: Announcement) {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      message: announcement.message,
      type: announcement.type,
      priority: announcement.priority,
      targetDashboards: announcement.targetDashboards,
      targetRoles: announcement.targetRoles,
      targetTenants: announcement.targetTenants,
      startDate: announcement.startDate,
      endDate: announcement.endDate,
      isActive: announcement.isActive,
      showDismissButton: announcement.showDismissButton,
      actionUrl: announcement.actionUrl,
      actionText: announcement.actionText,
    });
    setShowModal(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Anuncios Globales</h1>
          <p className="mt-2 text-gray-600">
            Crea y gestiona anuncios para todos los dashboards
          </p>
        </div>
        <button
          onClick={() => {
            setEditingAnnouncement(null);
            setFormData({
              title: '',
              message: '',
              type: 'info',
              priority: 'medium',
              targetDashboards: ['admin', 'dealer', 'seller', 'public'],
              isActive: true,
              showDismissButton: true,
            });
            setShowModal(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + Crear Anuncio
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Título
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Prioridad
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dashboards
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fechas
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {announcements.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No hay anuncios creados
                </td>
              </tr>
            ) : (
              announcements.map((announcement) => (
                <tr key={announcement.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{announcement.title}</div>
                    <div className="text-sm text-gray-500">{announcement.message.substring(0, 50)}...</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded ${
                      announcement.type === 'error' ? 'bg-red-100 text-red-800' :
                      announcement.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      announcement.type === 'success' ? 'bg-green-100 text-green-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {announcement.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded ${
                      announcement.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                      announcement.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      announcement.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {announcement.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {announcement.targetDashboards.join(', ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded ${
                      announcement.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {announcement.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {announcement.startDate && (
                      <div>Inicio: {new Date(announcement.startDate).toLocaleDateString('es-ES')}</div>
                    )}
                    {announcement.endDate && (
                      <div>Fin: {new Date(announcement.endDate).toLocaleDateString('es-ES')}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(announcement)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(announcement.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              {editingAnnouncement ? 'Editar Anuncio' : 'Crear Anuncio'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mensaje *
                </label>
                <textarea
                  value={formData.message || ''}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <select
                    value={formData.type || 'info'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="success">Success</option>
                    <option value="error">Error</option>
                    <option value="announcement">Anuncio</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prioridad
                  </label>
                  <select
                    value={formData.priority || 'medium'}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dashboards Objetivo
                </label>
                <div className="space-y-2">
                  {(['admin', 'dealer', 'seller', 'public'] as const).map((dashboard) => (
                    <label key={dashboard} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={(formData.targetDashboards || []).includes(dashboard)}
                        onChange={(e) => {
                          const current = formData.targetDashboards || [];
                          if (e.target.checked) {
                            setFormData({ ...formData, targetDashboards: [...current, dashboard] });
                          } else {
                            setFormData({ ...formData, targetDashboards: current.filter(d => d !== dashboard) });
                          }
                        }}
                        className="h-4 w-4"
                      />
                      <span className="text-sm text-gray-700 capitalize">
                        {dashboard === 'admin' ? 'Admin' : 
                         dashboard === 'dealer' ? 'Dealer' :
                         dashboard === 'seller' ? 'Vendedor' : 'Público'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Inicio (opcional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.startDate ? new Date(formData.startDate).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      startDate: e.target.value ? new Date(e.target.value).toISOString() : undefined 
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Fin (opcional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.endDate ? new Date(formData.endDate).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      endDate: e.target.value ? new Date(e.target.value).toISOString() : undefined 
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive !== false}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-gray-700">Activo</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.showDismissButton !== false}
                    onChange={(e) => setFormData({ ...formData, showDismissButton: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-gray-700">Mostrar botón de descartar</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL de Acción (opcional)
                </label>
                <input
                  type="url"
                  value={formData.actionUrl || ''}
                  onChange={(e) => setFormData({ ...formData, actionUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  placeholder="/dashboard"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Texto del Botón de Acción (opcional)
                </label>
                <input
                  type="text"
                  value={formData.actionText || ''}
                  onChange={(e) => setFormData({ ...formData, actionText: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  placeholder="Ver más"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingAnnouncement(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.title || !formData.message}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


