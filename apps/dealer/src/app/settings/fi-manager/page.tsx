'use client';

// Página para designar el Gerente F&I
// Solo visible para Dealers PRO y Enterprise

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status?: string;
}

interface Tenant {
  id: string;
  name: string;
  fiManagerId?: string;
  fiManagerPhone?: string;
  fiManagerEmail?: string;
}

export default function FIManagerSettingsPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Obtener tenant y usuario actual
      const tenantResponse = await fetch('/api/user');
      let tenantId: string | undefined;
      let currentUserId: string | undefined;
      
      if (tenantResponse.ok) {
        const tenantData = await tenantResponse.json();
        tenantId = tenantData.user.tenantId;
        currentUserId = tenantData.user.id || tenantData.user.userId;
        
        if (tenantId) {
          setTenant({
            id: tenantId,
            name: tenantData.user.name,
            fiManagerId: undefined, // Se obtendrá del endpoint específico
          });
        }
      }

      // Obtener gerente F&I actual
      const fiManagerResponse = await fetch('/api/settings/fi-manager');
      if (fiManagerResponse.ok) {
        const fiManagerData = await fiManagerResponse.json();
        setTenant((prev) => prev ? { 
          ...prev, 
          fiManagerId: fiManagerData.fiManagerId,
          fiManagerPhone: fiManagerData.fiManagerPhone || '',
          fiManagerEmail: fiManagerData.fiManagerEmail || ''
        } : null);
        setPhone(fiManagerData.fiManagerPhone || '');
        setEmail(fiManagerData.fiManagerEmail || '');
      }

      // Obtener usuarios del tenant (dealers, managers, assistants)
      const usersResponse = await fetch('/api/users');
      const allUsers: User[] = [];
      
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        // Agregar usuarios manager/assistant
        allUsers.push(...(usersData.users || []));
      }

      // Agregar el usuario actual (dealer principal) si no está en la lista
      if (currentUserId && tenantResponse.ok) {
        const tenantData = await tenantResponse.json();
        if (tenantData.user) {
          const currentUser: User = {
            id: currentUserId,
            name: tenantData.user.name,
            email: tenantData.user.email,
            role: 'dealer',
            status: 'active',
          };
          
          if (!allUsers.find((u) => u.id === currentUser.id)) {
            allUsers.push(currentUser);
          }
        }
      }
      
      setUsers(allUsers);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetFIManager = async (userId: string) => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings/fi-manager', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fiManagerId: userId,
          fiManagerPhone: phone,
          fiManagerEmail: email
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTenant((prev) => prev ? { 
          ...prev, 
          fiManagerId: data.fiManagerId,
          fiManagerPhone: data.fiManagerPhone || phone,
          fiManagerEmail: data.fiManagerEmail || email
        } : null);
        alert('Gerente F&I actualizado correctamente');
      } else {
        const error = await response.json();
        alert(error.error || 'Error al actualizar gerente F&I');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar gerente F&I');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateContactInfo = async () => {
    if (!tenant?.fiManagerId) {
      alert('Primero debes designar un gerente F&I');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/settings/fi-manager', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fiManagerId: tenant.fiManagerId,
          fiManagerPhone: phone,
          fiManagerEmail: email
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTenant((prev) => prev ? { 
          ...prev, 
          fiManagerPhone: data.fiManagerPhone || phone,
          fiManagerEmail: data.fiManagerEmail || email
        } : null);
        alert('Información de contacto actualizada correctamente');
      } else {
        const error = await response.json();
        alert(error.error || 'Error al actualizar información de contacto');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar información de contacto');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveFIManager = async () => {
    if (!confirm('¿Estás seguro de que quieres remover el gerente F&I? Las solicitudes se enviarán a todos los dealers.')) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/settings/fi-manager', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fiManagerId: null }),
      });

      if (response.ok) {
        setTenant((prev) => prev ? { ...prev, fiManagerId: undefined } : null);
        alert('Gerente F&I removido. Las solicitudes se enviarán a todos los dealers.');
      } else {
        const error = await response.json();
        alert(error.error || 'Error al remover gerente F&I');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al remover gerente F&I');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  }

  const currentFIManager = users.find((u) => u.id === tenant?.fiManagerId);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href="/settings" className="text-blue-600 hover:text-blue-700 text-sm">
          ← Volver a Configuración
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Gerente F&I</h1>
      <p className="text-gray-600 mb-8">
        Designa un usuario como Gerente F&I. Solo este usuario recibirá las notificaciones de solicitudes F&I.
        Si no designas uno, todas las solicitudes se enviarán a todos los dealers del tenant.
      </p>

      {/* Gerente F&I Actual */}
      {currentFIManager && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-green-900 mb-4">Gerente F&I Actual</h2>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-medium text-green-800">{currentFIManager.name}</p>
              <p className="text-sm text-green-600">{currentFIManager.email}</p>
            </div>
            <button
              onClick={handleRemoveFIManager}
              disabled={saving}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              Remover
            </button>
          </div>
          
          {/* Información de Contacto para Notificaciones */}
          <div className="border-t border-green-200 pt-4 mt-4">
            <h3 className="text-sm font-semibold text-green-900 mb-3">📧 Información de Contacto para Notificaciones</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-green-800 mb-1">
                  Teléfono (SMS)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1234567890"
                  className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-green-600 mt-1">Recibirá notificaciones por SMS cuando lleguen solicitudes o documentos</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-green-800 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="gerente@ejemplo.com"
                  className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-green-600 mt-1">Recibirá notificaciones por email cuando lleguen solicitudes o documentos</p>
              </div>
              <button
                onClick={handleUpdateContactInfo}
                disabled={saving}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar Información de Contacto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {!currentFIManager && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <p className="text-yellow-800">
            <strong>No hay gerente F&I designado.</strong> Las solicitudes F&I se enviarán a todos los dealers del tenant.
          </p>
        </div>
      )}

      {/* Lista de Usuarios Disponibles */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Usuarios Disponibles</h2>
          <p className="text-sm text-gray-600 mt-1">
            Selecciona un usuario para designarlo como Gerente F&I
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {users.map((user) => (
            <div
              key={user.id}
              className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
            >
              <div>
                <p className="font-medium text-gray-900">{user.name}</p>
                <p className="text-sm text-gray-600">{user.email}</p>
                <p className="text-xs text-gray-500 mt-1">Rol: {user.role}</p>
              </div>
              <div className="flex items-center gap-3">
                {tenant?.fiManagerId === user.id && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    Gerente F&I Actual
                  </span>
                )}
                {tenant?.fiManagerId !== user.id && (
                  <button
                    onClick={() => handleSetFIManager(user.id)}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    Designar como Gerente F&I
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {users.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No hay usuarios disponibles</p>
            <Link
              href="/users"
              className="text-blue-600 hover:text-blue-700 mt-2 inline-block"
            >
              Crear usuario →
            </Link>
          </div>
        )}
      </div>

      {/* Información Adicional */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Información</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>El Gerente F&I recibirá todas las notificaciones de solicitudes F&I</li>
          <li>Puedes cambiar el gerente F&I en cualquier momento</li>
          <li>Si no designas un gerente, todos los dealers recibirán las notificaciones</li>
          <li>Solo disponible para Dealers PRO y Enterprise</li>
        </ul>
      </div>
    </div>
  );
}

