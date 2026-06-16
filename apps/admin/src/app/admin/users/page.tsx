'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import StarRating from '@/components/StarRating';
import { getDashboardLoginUrl, getDashboardLabel } from '@/lib/dashboard-login-urls';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'dealer' | 'seller' | 'manager' | 'dealer_admin';
  tenantId?: string;
  dealerId?: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  lastLogin?: string;
  // Calificaciones
  sellerRating?: number;
  sellerRatingCount?: number;
  dealerRating?: number;
  dealerRatingCount?: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGrantFreeMonthModal, setShowGrantFreeMonthModal] = useState<{ userId: string; userName: string } | null>(null);
  const [filters, setFilters] = useState({
    role: '',
    status: '',
    search: '',
  });
  const hydratedSearchFromUrl = useRef(false);

  useEffect(() => {
    if (hydratedSearchFromUrl.current || typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search);
    const s = q.get('search');
    const role = q.get('role');
    if (s || role) {
      setFilters((f) => ({
        ...f,
        ...(s ? { search: s } : {}),
        ...(role ? { role } : {}),
      }));
      hydratedSearchFromUrl.current = true;
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [filters]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.role) params.append('role', filters.role);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleUserStatus(userId: string, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Error:', error);
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
          <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
          <p className="text-gray-600 mt-2">
            Control total sobre todos los usuarios de la plataforma
          </p>
          <p className="text-sm text-gray-500 mt-2 max-w-3xl">
            Los <strong>vendedores</strong> están aquí con rol <strong>Seller</strong>. Los que trabajan para un concesionario comparten el <strong>tenantId del dealer</strong>; los independientes tienen su propio tenant (ver también Tenants → filtro vendedor).
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium"
        >
          + Crear Usuario
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Buscar por nombre, email..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="border rounded px-3 py-2"
          />
          <select
            value={filters.role}
            onChange={(e) => setFilters({ ...filters, role: e.target.value })}
            className="border rounded px-3 py-2"
          >
            <option value="">Todos los roles</option>
            <option value="admin">Admin</option>
            <option value="dealer">Dealer</option>
            <option value="seller">Seller</option>
            <option value="manager">Gerente</option>
            <option value="dealer_admin">Admin del Dealer</option>
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="border rounded px-3 py-2"
          >
            <option value="">Todos los estados</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
            <option value="suspended">Suspendido</option>
          </select>
          <div className="flex items-center">
            <span className="text-sm text-gray-600">
              {users.length} usuario{users.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {users.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 text-lg">No hay usuarios registrados</p>
            <p className="text-gray-400 text-sm mt-2">Los usuarios aparecerán aquí cuando se creen</p>
          </div>
        ) : (
          <div className="table-scroll">
          <table className="w-full min-w-[720px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tenant/Dealer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Calificación
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Último Acceso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      user.role === 'admin'
                        ? 'bg-red-100 text-red-700'
                        : user.role === 'dealer'
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {user.role === 'admin'
                      ? 'Admin'
                      : user.role === 'dealer'
                        ? 'Dealer'
                        : user.role === 'seller'
                          ? 'Seller'
                          : user.role === 'manager'
                            ? 'Gerente'
                            : user.role === 'dealer_admin'
                              ? 'Admin dealer'
                              : user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {user.tenantId || user.dealerId || '-'}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      user.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : user.status === 'suspended'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {user.status === 'active' ? 'Activo' : user.status === 'suspended' ? 'Suspendido' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {(user.role === 'seller' && user.sellerRating && user.sellerRating > 0) || 
                   (user.role === 'dealer' && user.dealerRating && user.dealerRating > 0) ? (
                    <StarRating
                      rating={user.role === 'seller' ? (user.sellerRating || 0) : (user.dealerRating || 0)}
                      count={user.role === 'seller' ? (user.sellerRatingCount || 0) : (user.dealerRatingCount || 0)}
                      size="sm"
                      showCount={true}
                    />
                  ) : (
                    <span className="text-xs text-gray-400">Sin calificaciones</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {user.lastLogin
                    ? new Date(user.lastLogin).toLocaleString()
                    : 'Nunca'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleUserStatus(user.id, user.status)}
                      className={`text-sm px-3 py-1 rounded ${
                        user.status === 'active'
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {user.status === 'active' ? 'Desactivar' : 'Activar'}
                    </button>
                    {(user.role === 'dealer' || user.role === 'seller') && (
                      <button
                        onClick={() => setShowGrantFreeMonthModal({ userId: user.id, userName: user.name })}
                        className="text-sm px-3 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200"
                        title="Otorgar mes gratis"
                      >
                        🎁 Mes Gratis
                      </button>
                    )}
                    <Link
                      href={`/admin/users/${user.id}/edit`}
                      className="text-primary-600 hover:text-primary-700 text-sm"
                    >
                      Editar
                    </Link>
                  </div>
                </td>
              </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchUsers}
        />
      )}

      {showGrantFreeMonthModal && (
        <GrantFreeMonthModal
          userId={showGrantFreeMonthModal.userId}
          userName={showGrantFreeMonthModal.userName}
          onClose={() => setShowGrantFreeMonthModal(null)}
          onSuccess={fetchUsers}
        />
      )}
    </div>
  );
}

function GrantFreeMonthModal({
  userId,
  userName,
  onClose,
  onSuccess,
}: {
  userId: string;
  userName: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [months, setMonths] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = typeof window !== 'undefined' 
        ? localStorage.getItem('authToken') || 
          document.cookie.split(';').find(c => c.trim().startsWith('authToken='))?.split('=')[1]
        : null;

      const response = await fetch(`/api/admin/users/${userId}/grant-free-month`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ months }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(data.message);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al otorgar mes gratis');
      }
    } catch (err: any) {
      setError(err.message || 'Error al otorgar mes gratis');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">Otorgar Mes Gratis</h2>
          <p className="text-sm text-gray-600 mt-1">Usuario: {userName}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2">
              Cantidad de Meses Gratis
            </label>
            <input
              type="number"
              min="1"
              max="12"
              value={months}
              onChange={(e) => setMonths(parseInt(e.target.value) || 1)}
              className="w-full border rounded px-3 py-2"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Los meses gratis se aplicarán automáticamente en el próximo ciclo de facturación
            </p>
          </div>
          <div className="flex gap-2 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Otorgando...' : `Otorgar ${months} Mes${months > 1 ? 'es' : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateUserModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    name: '',
    role: 'seller' as 'admin' | 'dealer' | 'seller' | 'manager' | 'dealer_admin',
    tenantId: '',
    phone: '',
    whatsapp: '',
  });
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [postWarnings, setPostWarnings] = useState<string[]>([]);
  const [useManualDealerId, setUseManualDealerId] = useState(false);
  const [manualDealerId, setManualDealerId] = useState('');
  const [createdUser, setCreatedUser] = useState<{
    email: string;
    role: string;
    dealerManaged: boolean;
    welcomeEmailSent?: boolean;
  } | null>(null);

  const selectedTenant = tenants.find((t) => t.id === formData.tenantId);

  useEffect(() => {
    fetchTenants();
  }, []);

  async function fetchTenants() {
    const response = await fetch('/api/admin/tenants');
    const data = await response.json();
    setTenants(data.tenants || []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setPostWarnings([]);
    if (formData.password !== formData.passwordConfirm) {
      setSubmitError('Las contraseñas no coinciden.');
      return;
    }
    if (formData.role !== 'admin' && !formData.tenantId.trim()) {
      setSubmitError('Selecciona el tenant para este rol.');
      return;
    }
    if (formData.role !== 'admin' && !formData.phone.trim()) {
      setSubmitError('El teléfono es obligatorio para dealer, vendedor y personal del concesionario.');
      return;
    }
    setLoading(true);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          passwordConfirm: formData.passwordConfirm,
          name: formData.name,
          role: formData.role,
          tenantId: formData.role === 'admin' ? '' : formData.tenantId,
          phone: formData.role === 'admin' ? formData.phone.trim() || undefined : formData.phone.trim(),
          whatsapp: formData.whatsapp.trim() || undefined,
          ...(useManualDealerId && manualDealerId.trim()
            ? { dealerId: manualDealerId.trim() }
            : {}),
        }),
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        if (Array.isArray(data.warnings) && data.warnings.length > 0) {
          setPostWarnings(data.warnings);
          return;
        }
        const dealerManaged =
          formData.role === 'seller' &&
          (selectedTenant?.type === 'dealer' ||
            Boolean(useManualDealerId && manualDealerId.trim()));
        setCreatedUser({
          email: formData.email.trim().toLowerCase(),
          role: formData.role,
          dealerManaged,
          welcomeEmailSent: data.welcomeEmailSent === true,
        });
      } else {
        const err = await response.json().catch(() => ({}));
        setSubmitError(typeof err.error === 'string' ? err.error : 'Error al crear usuario');
      }
    } catch (error) {
      console.error('Error:', error);
      setSubmitError('Error de red al crear usuario. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  if (createdUser) {
    const loginUrl = getDashboardLoginUrl(createdUser.role);
    const panelLabel = getDashboardLabel(createdUser.role);
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-lg w-full shadow-xl p-6">
          <div className="rounded-lg bg-green-50 border border-green-200 text-green-900 px-4 py-3 mb-4">
            <p className="font-semibold">Usuario creado correctamente</p>
            <p className="text-sm mt-2">
              Email de acceso: <strong>{createdUser.email}</strong>
            </p>
            <p className="text-sm mt-2 text-green-800">
              Entrega el <strong>email</strong> y la <strong>contraseña temporal</strong> que definiste. Sin esos datos no
              podrá entrar a la plataforma. En el primer acceso deberá <strong>cambiar la contraseña</strong>.
            </p>
            {createdUser.welcomeEmailSent ? (
              <p className="text-sm mt-2 text-green-700">
                Se envió un email de bienvenida con el enlace de acceso (sin la contraseña, por seguridad).
              </p>
            ) : (
              <p className="text-sm mt-2 text-amber-800">
                No se pudo enviar el email de bienvenida; comparte manualmente el enlace y la contraseña.
              </p>
            )}
            <p className="text-sm mt-3">
              {panelLabel}:{' '}
              <a href={loginUrl} className="text-primary-700 underline break-all" target="_blank" rel="noreferrer">
                {loginUrl}
              </a>
            </p>
            {createdUser.dealerManaged ? (
              <p className="text-sm mt-3 text-primary-900 bg-primary-50 border border-primary-200 rounded px-3 py-2">
                Vendedor del concesionario: no paga membresía propia; hereda el plan del dealer.
              </p>
            ) : createdUser.role !== 'admin' ? (
              <p className="text-sm mt-3 text-amber-900 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                Tras el primer login deberá <strong>elegir y pagar su membresía</strong> si aún no tiene una activa.
              </p>
            ) : null}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setCreatedUser(null);
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
          <h2 className="text-2xl font-bold">Crear usuario</h2>
          <p className="text-sm text-gray-600 mt-2">
            Cuenta Firebase completa (email y contraseña). Para vendedores de un dealer, elige el tenant del
            concesionario.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {submitError && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">{submitError}</div>
          )}
          {postWarnings.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 text-sm space-y-3">
              {postWarnings.map((w, i) => (
                <p key={i}>{w}</p>
              ))}
              <button
                type="button"
                className="w-full px-3 py-2 rounded bg-amber-800 text-white text-sm font-medium hover:bg-amber-900"
                onClick={() => {
                  setPostWarnings([]);
                  onClose();
                  onSuccess();
                }}
              >
                Entendido, cerrar
              </button>
            </div>
          )}
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
            <label className="block text-sm font-medium mb-2">Contraseña *</label>
            <input
              type="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Confirmar contraseña *</label>
            <input
              type="password"
              autoComplete="new-password"
              value={formData.passwordConfirm}
              onChange={(e) => setFormData({ ...formData, passwordConfirm: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Rol</label>
            <select
              value={formData.role}
              onChange={(e) => {
                const next = e.target.value as typeof formData.role;
                setFormData({ ...formData, role: next, tenantId: next === 'admin' ? '' : formData.tenantId });
                if (next !== 'seller') {
                  setUseManualDealerId(false);
                  setManualDealerId('');
                }
              }}
              className="w-full border rounded px-3 py-2"
            >
              <option value="admin">Admin</option>
              <option value="dealer">Dealer</option>
              <option value="manager">Gerente del Dealer</option>
              <option value="dealer_admin">Administrador del Dealer</option>
              <option value="seller">Seller</option>
            </select>
          </div>
          {(formData.role === 'manager' || formData.role === 'dealer_admin') && (
            <p className="text-xs text-gray-600 -mt-2">
              Elige un tenant tipo <strong>Dealer</strong> (concesionario) al que pertenece esta persona.
            </p>
          )}
          {formData.role !== 'admin' && (
            <div>
              <label className="block text-sm font-medium mb-2">Tenant *</label>
              <select
                value={formData.tenantId}
                onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="">Seleccionar tenant</option>
                {(formData.role === 'manager' || formData.role === 'dealer_admin'
                  ? tenants.filter((t) => t.type === 'dealer')
                  : tenants
                ).map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name} ({tenant.type === 'dealer' ? 'Dealer' : 'Tenant vendedor'})
                  </option>
                ))}
              </select>
              {formData.role === 'seller' && (
                <>
                  <p className="text-xs text-gray-500 mt-2">
                    Para un vendedor de concesionario, elige el tenant <strong>Dealer</strong>. Para cuenta independiente tipo registro público, elige un tenant <strong>seller</strong> (o créalo en Tenants antes).
                  </p>
                  {selectedTenant?.type === 'dealer' && formData.tenantId && (
                    <p className="text-xs text-green-700 mt-2 bg-green-50 border border-green-100 rounded px-2 py-1.5">
                      Vinculación automática: se guardará <code className="text-[11px]">dealerId</code> al tenant del
                      concesionario, se copiará la <strong>membresía</strong> del tenant y se creará el registro en{' '}
                      <code className="text-[11px]">sub_users</code> del dealer (como al dar de alta desde el panel).
                    </p>
                  )}
                  {selectedTenant?.type === 'seller' && formData.tenantId && (
                    <p className="text-xs text-primary-700 mt-2 bg-primary-50 border border-primary-100 rounded px-2 py-1.5">
                      Vendedor independiente: sin <code className="text-[11px]">dealerId</code> de concesionario; se
                      usa la membresía del tenant vendedor si existe.
                    </p>
                  )}
                  <label className="flex items-start gap-2 mt-3 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={useManualDealerId}
                      onChange={(e) => {
                        setUseManualDealerId(e.target.checked);
                        if (!e.target.checked) setManualDealerId('');
                      }}
                    />
                    <span>
                      Avanzado: definir <code className="text-xs">dealerId</code> manualmente (sobrescribe el
                      automático)
                    </span>
                  </label>
                  {useManualDealerId && (
                    <input
                      type="text"
                      value={manualDealerId}
                      onChange={(e) => setManualDealerId(e.target.value)}
                      placeholder="ID del tenant del dealer o convención acordada"
                      className="w-full border rounded px-3 py-2 text-sm mt-1"
                    />
                  )}
                </>
              )}
            </div>
          )}
          {formData.role !== 'admin' && (
            <div className="space-y-3 border-t pt-4">
              <p className="text-sm font-semibold text-gray-800">Contacto del usuario</p>
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
          )}
          {formData.role === 'admin' && (
            <div className="space-y-3 border-t pt-4">
              <p className="text-sm font-semibold text-gray-800">Contacto (opcional)</p>
              <div>
                <label className="block text-sm font-medium mb-2">Teléfono</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Opcional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">WhatsApp (opcional)</label>
                <input
                  type="tel"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
          )}
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
              disabled={loading || postWarnings.length > 0}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

