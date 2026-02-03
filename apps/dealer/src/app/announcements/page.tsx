'use client';

import { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

interface Announcement {
  id: string;
  title: string;
  content: string;
  contentType: 'text' | 'image' | 'video';
  mediaUrl?: string;
  targetType: 'all' | 'selected';
  targetUserIds?: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  createdBy: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    contentType: 'text' as 'text' | 'image' | 'video',
    mediaUrl: '',
    targetType: 'all' as 'all' | 'selected',
    selectedUserIds: [] as string[],
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    startDate: '',
    endDate: '',
    sendNotifications: true,
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadAnnouncements();
    loadUsers();
  }, []);

  async function loadAnnouncements() {
    try {
      const response = await fetchWithAuth('/api/announcements', {});
      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (error) {
      console.error('Error loading announcements:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    try {
      const response = await fetchWithAuth('/api/sellers', {});
      if (response.ok) {
        const data = await response.json();
        // Incluir también otros usuarios del tenant
        const allUsers: User[] = [];
        
        // Agregar sellers
        if (data.sellers) {
          data.sellers.forEach((seller: any) => {
            allUsers.push({
              id: seller.id,
              name: seller.name || seller.email,
              email: seller.email,
              role: 'seller',
            });
          });
        }

        // Cargar otros usuarios (F&I, managers, etc.)
        try {
          const usersResponse = await fetchWithAuth('/api/users', {});
          if (usersResponse.ok) {
            const usersData = await usersResponse.json();
            if (usersData.users) {
              usersData.users.forEach((user: any) => {
                if (user.role !== 'dealer' && !allUsers.find(u => u.id === user.id)) {
                  allUsers.push({
                    id: user.id,
                    name: user.name || user.email,
                    email: user.email,
                    role: user.role,
                  });
                }
              });
            }
          }
        } catch (error) {
          console.warn('Error loading additional users:', error);
        }

        setUsers(allUsers);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }

  async function handleFileUpload(file: File): Promise<string> {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'announcements');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Error uploading file');
      }

      const data = await response.json();
      return data.url;
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.title || !formData.content) {
      alert('Por favor completa el título y el contenido');
      return;
    }

    if (formData.targetType === 'selected' && formData.selectedUserIds.length === 0) {
      alert('Por favor selecciona al menos un destinatario');
      return;
    }

    try {
      const payload = {
        ...formData,
        targetUserIds: formData.targetType === 'selected' ? formData.selectedUserIds : [],
        mediaUrl: formData.contentType !== 'text' ? formData.mediaUrl : undefined,
      };

      const url = editingAnnouncement 
        ? `/api/announcements/${editingAnnouncement.id}`
        : '/api/announcements';
      
      const method = editingAnnouncement ? 'PUT' : 'POST';

      const response = await fetchWithAuth(url, {
        method: method as any,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await loadAnnouncements();
        setShowCreateModal(false);
        setEditingAnnouncement(null);
        resetForm();
        alert(editingAnnouncement ? 'Anuncio actualizado' : 'Anuncio creado exitosamente');
      } else {
        const error = await response.json();
        alert(error.error || 'Error al guardar el anuncio');
      }
    } catch (error: any) {
      console.error('Error saving announcement:', error);
      alert('Error al guardar el anuncio');
    }
  }

  function resetForm() {
    setFormData({
      title: '',
      content: '',
      contentType: 'text',
      mediaUrl: '',
      targetType: 'all',
      selectedUserIds: [],
      priority: 'medium',
      startDate: '',
      endDate: '',
      sendNotifications: true,
    });
  }

  function handleEdit(announcement: Announcement) {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      contentType: announcement.contentType,
      mediaUrl: announcement.mediaUrl || '',
      targetType: announcement.targetType,
      selectedUserIds: announcement.targetUserIds || [],
      priority: announcement.priority,
      startDate: announcement.startDate ? announcement.startDate.split('T')[0] : '',
      endDate: announcement.endDate ? announcement.endDate.split('T')[0] : '',
      sendNotifications: false, // No re-enviar notificaciones al editar
    });
    setShowCreateModal(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de que quieres eliminar este anuncio?')) {
      return;
    }

    try {
      const response = await fetchWithAuth(`/api/announcements/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadAnnouncements();
        alert('Anuncio eliminado');
      } else {
        alert('Error al eliminar el anuncio');
      }
    } catch (error) {
      console.error('Error deleting announcement:', error);
      alert('Error al eliminar el anuncio');
    }
  }

  async function handleToggleActive(id: string, currentStatus: boolean) {
    try {
      const response = await fetchWithAuth(`/api/announcements/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        await loadAnnouncements();
      }
    } catch (error) {
      console.error('Error toggling announcement:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Anuncios y Notificaciones</h1>
          <p className="text-gray-600 mt-1">Gestiona los anuncios para tu personal</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingAnnouncement(null);
            setShowCreateModal(true);
          }}
          className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors font-medium flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Anuncio
        </button>
      </div>

      {/* Lista de Anuncios */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
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
                  Destinatarios
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prioridad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {announcements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No hay anuncios creados
                  </td>
                </tr>
              ) : (
                announcements.map((announcement) => (
                  <tr key={announcement.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{announcement.title}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {announcement.content.substring(0, 50)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {announcement.contentType === 'text' ? 'Texto' : 
                         announcement.contentType === 'image' ? 'Imagen' : 'Video'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {announcement.targetType === 'all' 
                        ? 'Todos' 
                        : `${announcement.targetUserIds?.length || 0} seleccionados`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        announcement.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                        announcement.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        announcement.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {announcement.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleActive(announcement.id, announcement.isActive)}
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          announcement.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {announcement.isActive ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(announcement.createdAt).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(announcement)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(announcement.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Crear/Editar */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingAnnouncement ? 'Editar Anuncio' : 'Nuevo Anuncio'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingAnnouncement(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Título */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                {/* Tipo de Contenido */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Contenido
                  </label>
                  <select
                    value={formData.contentType}
                    onChange={(e) => setFormData({ ...formData, contentType: e.target.value as any })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="text">Texto</option>
                    <option value="image">Imagen</option>
                    <option value="video">Video</option>
                  </select>
                </div>

                {/* Contenido/Texto */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contenido *
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={6}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                {/* Media URL (si es imagen o video) */}
                {(formData.contentType === 'image' || formData.contentType === 'video') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {formData.contentType === 'image' ? 'URL de Imagen' : 'URL de Video'} *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={formData.mediaUrl}
                        onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value })}
                        placeholder={`https://ejemplo.com/${formData.contentType === 'image' ? 'imagen.jpg' : formData.contentType === 'video' ? 'video.mp4' : 'archivo.txt'}`}
                        className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required={true}
                      />
                      <input
                        type="file"
                        accept={formData.contentType === 'image' ? 'image/*' : 'video/*'}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const url = await handleFileUpload(file);
                              setFormData({ ...formData, mediaUrl: url });
                            } catch (error) {
                              alert('Error al subir el archivo');
                            }
                          }
                        }}
                        className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        disabled={uploading}
                      />
                    </div>
                    {uploading && (
                      <p className="text-sm text-gray-500 mt-1">Subiendo archivo...</p>
                    )}
                  </div>
                )}

                {/* Tipo de Destinatarios */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destinatarios
                  </label>
                  <select
                    value={formData.targetType}
                    onChange={(e) => setFormData({ ...formData, targetType: e.target.value as any, selectedUserIds: [] })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="all">Todos los usuarios</option>
                    <option value="selected">Seleccionar usuarios</option>
                  </select>
                </div>

                {/* Selección de Usuarios */}
                {formData.targetType === 'selected' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seleccionar Usuarios *
                    </label>
                    <div className="border border-gray-300 rounded-lg p-4 max-h-60 overflow-y-auto">
                      {users.length === 0 ? (
                        <p className="text-sm text-gray-500">No hay usuarios disponibles</p>
                      ) : (
                        <div className="space-y-2">
                          {users.map((user) => (
                            <label key={user.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                              <input
                                type="checkbox"
                                checked={formData.selectedUserIds.includes(user.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({
                                      ...formData,
                                      selectedUserIds: [...formData.selectedUserIds, user.id],
                                    });
                                  } else {
                                    setFormData({
                                      ...formData,
                                      selectedUserIds: formData.selectedUserIds.filter(id => id !== user.id),
                                    });
                                  }
                                }}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              <div>
                                <span className="text-sm font-medium text-gray-900">{user.name}</span>
                                <span className="text-xs text-gray-500 ml-2">({user.role})</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    {formData.selectedUserIds.length > 0 && (
                      <p className="text-sm text-gray-500 mt-2">
                        {formData.selectedUserIds.length} usuario(s) seleccionado(s)
                      </p>
                    )}
                  </div>
                )}

                {/* Prioridad */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prioridad
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>

                {/* Fechas */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Inicio (opcional)
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Fin (opcional)
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                {/* Enviar Notificaciones */}
                {!editingAnnouncement && (
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.sendNotifications}
                        onChange={(e) => setFormData({ ...formData, sendNotifications: e.target.checked })}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">Enviar notificaciones a los destinatarios</span>
                    </label>
                  </div>
                )}

                {/* Botones */}
                <div className="flex justify-end gap-4 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingAnnouncement(null);
                      resetForm();
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-400"
                  >
                    {editingAnnouncement ? 'Actualizar' : 'Crear'} Anuncio
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

