'use client';

import { useState, useEffect } from 'react';

interface Policy {
  id: string;
  type: 'privacy' | 'terms' | 'refund' | 'shipping' | 'warranty' | 'data_protection' | 'cookie' | 'disclaimer' | 'custom';
  title: string;
  content: string;
  version: string;
  language: 'es' | 'en';
  isActive: boolean;
  isRequired: boolean;
  requiresAcceptance: boolean;
  applicableTo: ('admin' | 'dealer' | 'seller' | 'public' | 'advertiser')[];
  effectiveDate: string;
  expirationDate?: string;
}

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [formData, setFormData] = useState<Partial<Policy>>({
    type: 'privacy',
    language: 'es',
    isActive: true,
    isRequired: false,
    requiresAcceptance: true,
    applicableTo: ['public'],
    version: '1.0',
  });

  useEffect(() => {
    fetchPolicies();
  }, []);

  async function fetchPolicies() {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/policies', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setPolicies(data.policies || []);
      }
    } catch (error) {
      console.error('Error fetching policies:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      const url = '/api/admin/policies';
      const method = editingPolicy ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...(editingPolicy && { id: editingPolicy.id }),
          ...formData,
        }),
      });

      if (response.ok) {
        alert(editingPolicy ? 'Política actualizada' : 'Política creada');
        setShowModal(false);
        setEditingPolicy(null);
        setFormData({
          type: 'privacy',
          language: 'es',
          isActive: true,
          isRequired: false,
          requiresAcceptance: true,
          applicableTo: ['public'],
          version: '1.0',
        });
        await fetchPolicies();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al guardar política');
      }
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Error: ${error.message || 'Error desconocido'}`);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de eliminar esta política?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/policies?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        alert('Política eliminada');
        await fetchPolicies();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al eliminar política');
      }
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Error: ${error.message || 'Error desconocido'}`);
    }
  }

  function handleEdit(policy: Policy) {
    setEditingPolicy(policy);
    setFormData({
      type: policy.type,
      title: policy.title,
      content: policy.content,
      version: policy.version,
      language: policy.language,
      isActive: policy.isActive,
      isRequired: policy.isRequired,
      requiresAcceptance: policy.requiresAcceptance,
      applicableTo: policy.applicableTo,
      effectiveDate: policy.effectiveDate,
      expirationDate: policy.expirationDate,
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
          <h1 className="text-3xl font-bold text-gray-900">Políticas y Disclosures</h1>
          <p className="mt-2 text-gray-600">
            Gestiona todas las políticas y disclosures de la plataforma
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={async () => {
              if (!confirm('¿Crear políticas por defecto? Esto creará las políticas básicas si no existen.')) {
                return;
              }
              try {
                // Obtener el token de autenticación desde localStorage o cookies
                const getAuthToken = () => {
                  // Primero intentar desde localStorage
                  const localToken = localStorage.getItem('authToken');
                  if (localToken) {
                    return localToken;
                  }
                  
                  // Si no está en localStorage, buscar en cookies
                  const cookies = document.cookie.split(';');
                  for (let cookie of cookies) {
                    const [name, value] = cookie.trim().split('=');
                    if (name === 'authToken') {
                      try {
                        return decodeURIComponent(value);
                      } catch {
                        return value;
                      }
                    }
                  }
                  return null;
                };

                const token = getAuthToken();
                
                if (!token) {
                  alert('Error: No se encontró token de autenticación. Por favor, inicia sesión nuevamente.');
                  return;
                }

                const headers: HeadersInit = {
                  'Content-Type': 'application/json',
                };
                
                headers['Authorization'] = `Bearer ${token}`;

                const response = await fetch('/api/admin/policies/initialize', {
                  method: 'POST',
                  credentials: 'include',
                  headers,
                });
                
                // Verificar el tipo de contenido de la respuesta
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                  const text = await response.text();
                  console.error('Respuesta no es JSON:', text.substring(0, 200));
                  alert(`Error: El servidor devolvió una respuesta inesperada (${response.status}). Por favor, verifica la consola para más detalles.`);
                  return;
                }
                
                if (response.ok) {
                  const data = await response.json();
                  alert(data.message || 'Políticas inicializadas');
                  await fetchPolicies();
                } else {
                  try {
                    const error = await response.json();
                    alert(error.error || 'Error al inicializar políticas');
                  } catch (parseError) {
                    alert(`Error ${response.status}: ${response.statusText}`);
                  }
                }
              } catch (error: any) {
                console.error('Error inicializando políticas:', error);
                alert(`Error: ${error.message || 'Error de conexión. Verifica tu conexión a internet e intenta nuevamente.'}`);
              }
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            🚀 Inicializar Políticas por Defecto
          </button>
          <button
            onClick={() => {
              setEditingPolicy(null);
              setFormData({
                type: 'privacy',
                language: 'es',
                isActive: true,
                isRequired: false,
                requiresAcceptance: true,
                applicableTo: ['public'],
                version: '1.0',
              });
              setShowModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            + Crear Política
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Título
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Versión
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Idioma
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Requerida
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {policies.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No hay políticas creadas
                </td>
              </tr>
            ) : (
              policies.map((policy) => (
                <tr key={policy.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                      {policy.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{policy.title}</div>
                    <div className="text-sm text-gray-500">
                      Aplica a: {policy.applicableTo.join(', ')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {policy.version}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {policy.language.toUpperCase()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded ${
                      policy.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {policy.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded ${
                      policy.isRequired ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {policy.isRequired ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(policy)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(policy.id)}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              {editingPolicy ? 'Editar Política' : 'Crear Política'}
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo *
                  </label>
                  <select
                    value={formData.type || 'privacy'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="privacy">Privacidad</option>
                    <option value="terms">Términos y Condiciones</option>
                    <option value="refund">Política de Reembolsos</option>
                    <option value="shipping">Política de Envíos</option>
                    <option value="warranty">Garantía</option>
                    <option value="data_protection">Protección de Datos</option>
                    <option value="cookie">Política de Cookies</option>
                    <option value="disclaimer">Disclaimer</option>
                    <option value="custom">Personalizada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Idioma *
                  </label>
                  <select
                    value={formData.language || 'es'}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>

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
                  Contenido *
                </label>
                <textarea
                  value={formData.content || ''}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  rows={15}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Versión *
                  </label>
                  <input
                    type="text"
                    value={formData.version || '1.0'}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Efectividad *
                  </label>
                  <input
                    type="date"
                    value={formData.effectiveDate ? new Date(formData.effectiveDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      effectiveDate: new Date(e.target.value).toISOString() 
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Expiración (opcional)
                </label>
                <input
                  type="date"
                  value={formData.expirationDate ? new Date(formData.expirationDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    expirationDate: e.target.value ? new Date(e.target.value).toISOString() : undefined 
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Aplica a *
                </label>
                <div className="space-y-2">
                  {(['admin', 'dealer', 'seller', 'public', 'advertiser'] as const).map((role) => (
                    <label key={role} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={(formData.applicableTo || []).includes(role)}
                        onChange={(e) => {
                          const current = formData.applicableTo || [];
                          if (e.target.checked) {
                            setFormData({ ...formData, applicableTo: [...current, role] });
                          } else {
                            setFormData({ ...formData, applicableTo: current.filter(r => r !== role) });
                          }
                        }}
                        className="h-4 w-4"
                      />
                      <span className="text-sm text-gray-700 capitalize">
                        {role === 'admin' ? 'Admin' : 
                         role === 'dealer' ? 'Dealer' :
                         role === 'seller' ? 'Vendedor' : 
                         role === 'public' ? 'Público' : 'Anunciante'}
                      </span>
                    </label>
                  ))}
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
                  <span className="text-sm text-gray-700">Activa</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.isRequired === true}
                    onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-gray-700">Requerida</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.requiresAcceptance !== false}
                    onChange={(e) => setFormData({ ...formData, requiresAcceptance: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-gray-700">Requiere Aceptación</span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingPolicy(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.title || !formData.content}
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

