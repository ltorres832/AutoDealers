'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRealtimeTenants } from '@/hooks/useRealtimeTenants';
import { RealtimeIndicator } from '@/components/RealtimeIndicator';
import StarRating from '@/components/StarRating';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { getDashboardLoginUrl } from '@/lib/dashboard-login-urls';

interface Tenant {
  id: string;
  name: string;
  companyName?: string; // Nombre de la compañía (solo para dealers)
  type: 'dealer' | 'seller';
  subdomain?: string;
  status: string;
  membershipId?: string;
  createdAt: string;
  userCount?: number;
  vehicleCount?: number;
  leadCount?: number;
  // Calificaciones
  avgDealerRating?: number;
  dealerRatingCount?: number;
  avgSellerRating?: number;
  sellerRatingCount?: number;
}

export default function AdminTenantsPage() {
  const { tenants, loading, error } = useRealtimeTenants();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'dealer' | 'seller'>('all');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filteredTenants =
    typeFilter === 'all' ? tenants : tenants.filter((t) => t.type === typeFilter);

  async function confirmDeleteTenant() {
    if (!deleteTarget) return;
    if (deleteConfirmName.trim() !== deleteTarget.name.trim()) {
      setDeleteError('El nombre no coincide exactamente con el tenant.');
      return;
    }
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetchWithAuth(`/api/admin/tenants/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError(typeof data.error === 'string' ? data.error : 'No se pudo eliminar');
        return;
      }
      setDeleteTarget(null);
      setDeleteConfirmName('');
    } catch {
      setDeleteError('Error de red');
    } finally {
      setDeleteLoading(false);
    }
  }

  async function toggleStatus(tenantId: string, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    
    try {
      const response = await fetchWithAuth(`/api/admin/tenants/${tenantId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar estado');
      }
      // Los datos se actualizan automáticamente con useRealtimeTenants
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar el estado del tenant');
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="font-semibold">Error al cargar tenants</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Gestión de Tenants</h1>
            <RealtimeIndicator isActive={!loading} />
          </div>
          <p className="text-gray-600 mt-2">
            Control total sobre todos los dealers y vendedores en tiempo real
          </p>
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2 max-w-3xl">
            Al crear un tenant se genera también la <strong>cuenta de acceso</strong> (Firebase): email, contraseña y
            teléfono del titular, igual que en el registro público. Así el dealer o vendedor puede entrar al panel; el
            admin puede seguir ayudando desde vehículos, membresías, etc.
          </p>
          <p className="text-sm text-gray-500 mt-2 max-w-3xl">
            Cada <strong>dealer</strong> es un tenant. Los <strong>vendedores del concesionario</strong> son usuarios con rol Seller dentro del mismo tenant del dealer (no generan un tenant aparte). Los <strong>vendedores independientes</strong> del registro público sí tienen tenant tipo &quot;seller&quot;.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            {(['all', 'dealer', 'seller'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTypeFilter(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  typeFilter === key
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {key === 'all' ? 'Todos' : key === 'dealer' ? 'Solo dealers' : 'Solo tenants vendedor'}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium"
        >
          + Crear Tenant
        </button>
      </div>

      {filteredTenants.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 text-lg">No hay tenants en este filtro</p>
          <p className="text-gray-400 text-sm mt-2">
            {typeFilter === 'seller'
              ? 'Los vendedores de un dealer no crean tenant propio: míralos en Usuarios con filtro Seller.'
              : 'Los tenants aparecerán aquí cuando se creen'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTenants.map((tenant) => (
          <div key={tenant.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                {tenant.type === 'dealer' && tenant.companyName && (
                  <p className="text-xs text-primary-600 font-semibold mb-1">
                    {tenant.companyName}
                  </p>
                )}
                <h3 className="text-lg font-bold">{tenant.name}</h3>
                <p className="text-sm text-gray-600 capitalize">{tenant.type}</p>
                {tenant.subdomain && (
                  <p className="text-xs text-gray-500 mt-1">
                    {tenant.subdomain}.autodealers.com
                  </p>
                )}
              </div>
              <span
                className={`px-3 py-1 rounded text-xs font-medium ${
                  tenant.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : tenant.status === 'suspended'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {tenant.status === 'active' ? 'Activo' : tenant.status === 'suspended' ? 'Suspendido' : 'Inactivo'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4 text-center">
              <div>
                <p className="text-2xl font-bold">{tenant.userCount || 0}</p>
                <p className="text-xs text-gray-500">Usuarios</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{tenant.vehicleCount || 0}</p>
                <p className="text-xs text-gray-500">Vehículos</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{tenant.leadCount || 0}</p>
                <p className="text-xs text-gray-500">Leads</p>
              </div>
            </div>

            {/* Calificaciones */}
            {((tenant.type === 'dealer' && tenant.avgDealerRating && tenant.avgDealerRating > 0) || 
              (tenant.type === 'seller' && tenant.avgSellerRating && tenant.avgSellerRating > 0)) && (
              <div className="mb-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Calificación Promedio:</span>
                  <StarRating
                    rating={tenant.type === 'dealer' ? (tenant.avgDealerRating || 0) : (tenant.avgSellerRating || 0)}
                    count={tenant.type === 'dealer' ? (tenant.dealerRatingCount || 0) : (tenant.sellerRatingCount || 0)}
                    size="sm"
                    showCount={true}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/admin/tenants/${tenant.id}`}
                className="flex-1 text-center px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 text-sm"
              >
                Ver Detalles
              </Link>
              <button
                onClick={() => toggleStatus(tenant.id, tenant.status)}
                className={`px-4 py-2 rounded text-sm ${
                  tenant.status === 'active'
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {tenant.status === 'active' ? 'Suspender' : 'Activar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteError(null);
                  setDeleteConfirmName('');
                  setDeleteTarget({ id: tenant.id, name: tenant.name });
                }}
                className="px-4 py-2 rounded text-sm bg-gray-100 text-gray-800 hover:bg-red-50 hover:text-red-700 border border-gray-200"
              >
                Eliminar
              </button>
            </div>
          </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-red-800">Eliminar tenant</h2>
            <p className="text-sm text-gray-700 mt-2">
              Se borrará el documento del tenant y los vehículos en su inventario. Los usuarios en Firebase Auth{' '}
              <strong>no</strong> se eliminan automáticamente; hazlo desde Usuarios si hace falta. Otras subcolecciones
              pueden quedar huérfanas.
            </p>
            <p className="text-sm font-medium mt-4">
              Escribe el nombre exacto del tenant para confirmar:{' '}
              <span className="text-primary-700">{deleteTarget.name}</span>
            </p>
            <input
              type="text"
              className="w-full border rounded px-3 py-2 mt-2"
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder="Nombre del tenant"
            />
            {deleteError && <p className="text-sm text-red-600 mt-2">{deleteError}</p>}
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                className="px-4 py-2 border rounded"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteConfirmName('');
                  setDeleteError(null);
                }}
                disabled={deleteLoading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                disabled={deleteLoading}
                onClick={() => void confirmDeleteTenant()}
              >
                {deleteLoading ? 'Eliminando…' : 'Eliminar definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <CreateTenantModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            // Los datos se actualizan automáticamente con useRealtimeTenants
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}

function CreateTenantModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    type: 'dealer' as 'dealer' | 'seller',
    subdomain: '',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
    ownerPasswordConfirm: '',
    phone: '',
    whatsapp: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdOwnerEmail, setCreatedOwnerEmail] = useState<string | null>(null);
  const [createdTenantType, setCreatedTenantType] = useState<'dealer' | 'seller' | null>(null);
  const [welcomeEmailSent, setWelcomeEmailSent] = useState<boolean | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (formData.ownerPassword !== formData.ownerPasswordConfirm) {
      setSubmitError('Las contraseñas no coinciden.');
      return;
    }
    if (formData.ownerPassword.length < 6) {
      setSubmitError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setLoading(true);

    try {
      const response = await fetchWithAuth('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          companyName: formData.companyName,
          type: formData.type,
          subdomain: formData.subdomain || undefined,
          ownerName: formData.ownerName,
          ownerEmail: formData.ownerEmail,
          ownerPassword: formData.ownerPassword,
          ownerPasswordConfirm: formData.ownerPasswordConfirm,
          phone: formData.phone,
          whatsapp: formData.whatsapp || undefined,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setCreatedOwnerEmail(typeof data.owner?.email === 'string' ? data.owner.email : '');
        setCreatedTenantType(formData.type);
        setWelcomeEmailSent(data.welcomeEmailSent === true);
      } else {
        setSubmitError(typeof data.error === 'string' ? data.error : 'Error al crear tenant');
      }
    } catch (error) {
      console.error('Error:', error);
      setSubmitError('Error de red al crear tenant. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  if (createdOwnerEmail !== null && createdTenantType) {
    const loginUrl = getDashboardLoginUrl(createdTenantType);
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-lg w-full shadow-xl p-6">
          <div className="rounded-lg bg-green-50 border border-green-200 text-green-900 px-4 py-3 mb-4">
            <p className="font-semibold">Tenant creado correctamente</p>
            <p className="text-sm mt-2">
              Email de acceso: <strong>{createdOwnerEmail || '—'}</strong>
            </p>
            <p className="text-sm mt-2 text-green-800">
              Entrega al cliente el <strong>email</strong> y la <strong>contraseña temporal</strong> que definiste aquí.
              Sin esos datos no podrá iniciar sesión.
            </p>
            {welcomeEmailSent ? (
              <p className="text-sm mt-2 text-green-700">
                Se envió un email de bienvenida con el enlace de acceso (sin la contraseña, por seguridad).
              </p>
            ) : (
              <p className="text-sm mt-2 text-amber-800">
                No se pudo enviar el email de bienvenida; comparte manualmente el enlace y la contraseña.
              </p>
            )}
            <p className="text-sm mt-2 text-green-800">
              En el primer acceso se le pedirá <strong>cambiar la contraseña</strong>.
            </p>
            <p className="text-sm mt-3">
              URL de login ({createdTenantType === 'dealer' ? 'dealer' : 'vendedor'}):{' '}
              <a href={loginUrl} className="text-primary-700 underline break-all" target="_blank" rel="noreferrer">
                {loginUrl}
              </a>
            </p>
            <p className="text-sm mt-3 text-amber-900 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              Tras el primer login deberá <strong>elegir y pagar su membresía</strong> para activar todas las
              funciones del panel.
            </p>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setCreatedOwnerEmail(null);
                setCreatedTenantType(null);
                setWelcomeEmailSent(null);
                onSuccess();
                onClose();
              }}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">Crear tenant y cuenta de acceso</h2>
          <p className="text-sm text-gray-600 mt-2">
            Se crea el espacio (dealer o vendedor independiente) y el usuario titular con el que inician sesión en su
            app.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {submitError && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">{submitError}</div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2">Tipo</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'dealer' | 'seller' })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="dealer">Dealer</option>
              <option value="seller">Seller (vendedor independiente)</option>
            </select>
          </div>
          {formData.type === 'dealer' && (
            <div>
              <label className="block text-sm font-medium mb-2">Nombre de la compañía *</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="Ej: Grupo Automotriz ABC"
                required={formData.type === 'dealer'}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2">
              {formData.type === 'dealer' ? 'Nombre del dealer (local) *' : 'Nombre público del vendedor *'}
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder={formData.type === 'dealer' ? 'Ej: Dealer Centro' : 'Ej: Juan Pérez Motors'}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Subdominio (opcional)</label>
            <div className="flex items-center">
              <input
                type="text"
                value={formData.subdomain}
                onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
                className="flex-1 border rounded-l px-3 py-2"
                placeholder="mi-dealer"
              />
              <span className="border border-l-0 rounded-r px-3 py-2 bg-gray-50 text-sm">.autodealers.com</span>
            </div>
          </div>

          <div className="border-t pt-4 mt-2">
            <p className="text-sm font-semibold text-gray-800 mb-3">Titular de la cuenta (login)</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2">Nombre del titular *</label>
                <input
                  type="text"
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Persona que recibirá el acceso"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email (usuario) *</label>
                <input
                  type="email"
                  autoComplete="off"
                  value={formData.ownerEmail}
                  onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="correo@ejemplo.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Contraseña *</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={formData.ownerPassword}
                  onChange={(e) => setFormData({ ...formData, ownerPassword: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Confirmar contraseña *</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={formData.ownerPasswordConfirm}
                  onChange={(e) => setFormData({ ...formData, ownerPasswordConfirm: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Teléfono *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="+1 787 000 0000"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">WhatsApp (opcional)</label>
                <input
                  type="tel"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Si vacío, se usa el teléfono"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              {loading ? 'Creando...' : 'Crear tenant y cuenta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

