'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Seller {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  isActive?: boolean;
  salesCount?: number;
  revenue?: number;
  createdAt: string;
  tenantId?: string;
  dealerId?: string;
}

export default function SellersPage() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchSellers();
    // También ejecutar diagnóstico
    fetchDebug();
  }, []);

  async function fetchDebug() {
    try {
      const { fetchWithAuth } = await import('@/lib/fetch-with-auth');
      const response = await fetchWithAuth('/api/sellers/debug', {});
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 [SELLERS PAGE] DEBUG INFO:', data.debug);
      }
    } catch (error) {
      console.error('Error en debug:', error);
    }
  }

  async function fetchSellers() {
    try {
      console.log('🔍 [SELLERS PAGE] Iniciando búsqueda de vendedores...');
      
      // Usar fetchWithAuth que automáticamente renueva el token
      const { fetchWithAuth } = await import('@/lib/fetch-with-auth');
      
      const response = await fetchWithAuth('/api/sellers', {});
      
      console.log('📡 [SELLERS PAGE] Respuesta del servidor:', {
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ [SELLERS PAGE] Datos recibidos:', {
          sellersCount: data.sellers?.length || 0,
          sellers: data.sellers,
          fullData: data,
        });
        
        if (data.sellers && Array.isArray(data.sellers)) {
          console.log('✅ [SELLERS PAGE] Estableciendo vendedores:', data.sellers.length);
          setSellers(data.sellers);
        } else {
          console.warn('⚠️ [SELLERS PAGE] data.sellers no es un array:', data.sellers);
          setSellers([]);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'No se pudo parsear el error' }));
        console.error('❌ [SELLERS PAGE] Error obteniendo vendedores:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        setSellers([]);
      }
    } catch (error) {
      console.error('❌ [SELLERS PAGE] Error en fetchSellers:', error);
      setSellers([]);
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
          <h1 className="text-3xl font-bold">Vendedores</h1>
          <p className="text-gray-600 mt-2">
            Gestiona todos tus vendedores y sus accesos
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium"
        >
          + Agregar Vendedor
        </button>
      </div>

      {sellers.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No hay vendedores registrados
          </h3>
          <p className="text-gray-600 mb-6">
            Comienza agregando tu primer vendedor para gestionar leads y ventas.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium"
          >
            + Agregar Primer Vendedor
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sellers.map((seller) => (
            <div key={seller.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold">{seller.name}</h3>
                  <p className="text-sm text-gray-600">{seller.email}</p>
                  {seller.phone && (
                    <p className="text-sm text-gray-500 mt-1">📱 {seller.phone}</p>
                  )}
                </div>
              <span
                className={`px-3 py-1 rounded text-xs ${
                  (seller.status === 'active' || seller.isActive === true || (!seller.status && !seller.isActive))
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {(seller.status === 'active' || seller.isActive === true || (!seller.status && !seller.isActive)) ? 'Activo' : 'Inactivo'}
              </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Ventas</p>
                  <p className="text-2xl font-bold">{seller.salesCount || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Revenue</p>
                  <p className="text-2xl font-bold">
                    ${(seller.revenue || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {seller.tenantId && seller.tenantId !== seller.dealerId && (
                  <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                    ✅ Tiene cuenta propia con página web
                  </div>
                )}
                <div className="flex gap-2">
                  <Link
                    href={`/sellers/${seller.id}`}
                    className="flex-1 text-center px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 text-sm"
                  >
                    Ver Detalles
                  </Link>
                  <Link
                    href={`/sellers/${seller.id}`}
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                  >
                    Editar
                  </Link>
                </div>
            </div>
          </div>
        ))}
        </div>
      )}

      {showCreateModal && (
        <CreateSellerModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchSellers}
        />
      )}
    </div>
  );
}

function CreateSellerModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    role: 'assistant' as 'manager' | 'assistant' | 'viewer',
    createOwnTenant: false,
    subdomain: '',
  });
  const [loading, setLoading] = useState(false);
  const [canCreateTenant, setCanCreateTenant] = useState(false);

  useEffect(() => {
    checkTenantCreationPermission();
  }, []);

  async function checkTenantCreationPermission() {
    try {
      const { fetchWithAuth } = await import('@/lib/fetch-with-auth');
      const response = await fetchWithAuth('/api/sellers/check-permissions', {});
      const data = await response.json();
      setCanCreateTenant(data.canCreateTenant || false);
    } catch (error) {
      console.error('Error:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // Usar fetchWithAuth que automáticamente renueva el token
      const { fetchWithAuth } = await import('@/lib/fetch-with-auth');
      
      const response = await fetchWithAuth('/api/sellers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onClose();
        onSuccess();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Error al crear vendedor');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear vendedor. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b flex-shrink-0">
          <h2 className="text-2xl font-bold">Agregar Vendedor</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
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
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Contraseña</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Teléfono <span className="text-gray-500 text-xs">(opcional)</span>
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="+1 234 567 8900"
            />
            <p className="text-xs text-gray-500 mt-1">
              Se usará para notificaciones SMS y WhatsApp de leads, citas y mensajes
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Rol</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="assistant">Vendedor</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              El vendedor podrá gestionar leads, mensajes, citas y ver reportes
            </p>
          </div>

          <div className="border-t pt-4">
            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={formData.createOwnTenant}
                onChange={(e) => setFormData({ ...formData, createOwnTenant: e.target.checked })}
              />
              <span className="text-sm font-medium">
                Crear vendedor con cuenta propia y página web personal
              </span>
            </label>
            <p className="text-xs text-gray-600 mb-3 ml-6">
              Si está marcado, el vendedor tendrá su propia cuenta independiente con su propia página web.
              Si no está marcado, solo tendrá acceso a tu cuenta como usuario adicional.
            </p>
            {formData.createOwnTenant && (
              <div className="mt-2 ml-6 p-3 bg-blue-50 border border-blue-200 rounded">
                <label className="block text-sm font-medium mb-2">Subdominio para página web</label>
                <input
                  type="text"
                  value={formData.subdomain}
                  onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="ej: vendedor1"
                  pattern="[a-z0-9-]+"
                  required={formData.createOwnTenant}
                />
                <p className="text-xs text-blue-700 mt-1">
                  ✅ El subdominio es del dominio de la plataforma (autodealers.com)
                  <br />
                  ✅ El vendedor tendrá su propia página web en: <strong>https://{formData.subdomain || 'subdomain'}.autodealers.com</strong>
                  <br />
                  ✅ Podrá iniciar sesión con su email y contraseña
                  <br />
                  ✅ Tendrá su propio dashboard, leads, inventario y configuración
                </p>
                {!canCreateTenant && (
                  <p className="text-xs text-red-600 mt-2">
                    ⚠️ Tu membresía actual no permite crear subdominios. Necesitas actualizar tu plan.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-4 flex-shrink-0">
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
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:bg-gray-300"
            >
              {loading ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

