'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import BackButton from '@/components/BackButton';

type UserRecord = Record<string, unknown>;

export default function AdminEditUserPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [authInfo, setAuthInfo] = useState<{
    disabled: boolean;
    emailVerified: boolean;
    email?: string;
  } | null>(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    role: 'seller' as string,
    tenantId: '',
    dealerId: '',
    membershipId: '',
    membershipType: 'seller' as 'dealer' | 'seller',
    status: 'active',
    bio: '',
    photo: '',
    publicPromoVideoUrl: '',
    corporateEmail: '',
    referralCode: '',
    newPassword: '',
    authDisabled: false,
    settingsJson: '{}',
    settingsReplace: false,
    permissionsJson: '{}',
    clearPermissions: false,
  });

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/users/${id}`, { credentials: 'include' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(typeof data.error === 'string' ? data.error : 'Error al cargar');
          return;
        }
        const u = (data.user || {}) as UserRecord;
        setAuthInfo(
          data.auth
            ? {
                disabled: !!data.auth.disabled,
                emailVerified: !!data.auth.emailVerified,
                email: typeof data.auth.email === 'string' ? data.auth.email : undefined,
              }
            : null
        );
        setForm({
          name: String(u.name ?? ''),
          email: String(u.email ?? ''),
          phone: String(u.phone ?? ''),
          whatsapp: String(u.whatsapp ?? ''),
          role: String(u.role ?? 'seller'),
          tenantId: String(u.tenantId ?? ''),
          dealerId: String(u.dealerId ?? ''),
          membershipId: String(u.membershipId ?? ''),
          membershipType: u.membershipType === 'dealer' ? 'dealer' : 'seller',
          status: String(u.status ?? 'active'),
          bio: String(u.bio ?? ''),
          photo: String(u.photo ?? ''),
          publicPromoVideoUrl: String(u.publicPromoVideoUrl ?? ''),
          corporateEmail: String(u.corporateEmail ?? ''),
          referralCode: String(u.referralCode ?? ''),
          newPassword: '',
          authDisabled: !!data.auth?.disabled,
          settingsJson: JSON.stringify(
            u.settings && typeof u.settings === 'object' ? u.settings : {},
            null,
            2
          ),
          settingsReplace: false,
          permissionsJson: JSON.stringify(
            u.permissions && typeof u.permissions === 'object' ? u.permissions : {},
            null,
            2
          ),
          clearPermissions: false,
        });
      } catch {
        setError('Error de red');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    let settings: Record<string, unknown> | undefined;
    try {
      settings = JSON.parse(form.settingsJson || '{}');
      if (typeof settings !== 'object' || settings === null || Array.isArray(settings)) {
        throw new Error('settings');
      }
    } catch {
      setError('JSON de settings inválido');
      setSaving(false);
      return;
    }

    let permissions: Record<string, unknown> | undefined;
    if (!form.clearPermissions) {
      try {
        permissions = JSON.parse(form.permissionsJson || '{}');
        if (typeof permissions !== 'object' || permissions === null || Array.isArray(permissions)) {
          throw new Error('permissions');
        }
      } catch {
        setError('JSON de permissions inválido');
        setSaving(false);
        return;
      }
    }

    const body: Record<string, unknown> = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      role: form.role,
      tenantId: form.tenantId.trim() || null,
      dealerId: form.dealerId.trim() || null,
      membershipId: form.membershipId.trim(),
      membershipType: form.membershipType,
      status: form.status,
      bio: form.bio.trim() || null,
      photo: form.photo.trim() || null,
      publicPromoVideoUrl: form.publicPromoVideoUrl.trim() || null,
      corporateEmail: form.corporateEmail.trim() || null,
      referralCode: form.referralCode.trim() || null,
      authDisabled: form.authDisabled,
      settings,
      settingsReplace: form.settingsReplace,
    };

    if (form.clearPermissions) {
      body.permissions = null;
    } else {
      body.permissions = permissions;
    }

    if (form.newPassword.trim()) {
      body.newPassword = form.newPassword.trim();
    }

    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Error al guardar');
        return;
      }
      router.push('/admin/users');
    } catch {
      setError('Error de red al guardar');
    } finally {
      setSaving(false);
    }
  }

  if (!id) {
    return <p className="p-8 text-red-600">ID inválido</p>;
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <BackButton label="Volver a usuarios" />
        <Link href="/admin/tenants" className="text-sm text-primary-600 hover:underline">
          Ir a Tenants
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-2">Editar usuario (control total)</h1>
      <p className="text-sm text-gray-600 mb-2">
        UID: <code className="bg-gray-100 px-1 rounded text-xs">{id}</code>
        {authInfo && (
          <span className="ml-3">
            Auth: {authInfo.emailVerified ? 'email verificado' : 'email no verificado'}
            {authInfo.email && authInfo.email !== form.email ? (
              <span className="text-amber-700"> · Auth email: {authInfo.email}</span>
            ) : null}
          </span>
        )}
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">Nombre *</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">Email (Firestore + Firebase Auth) *</label>
            <input
              type="email"
              className="w-full border rounded px-3 py-2"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Teléfono</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">WhatsApp</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Rol *</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="admin">admin</option>
              <option value="master_dealer">master_dealer</option>
              <option value="dealer">dealer</option>
              <option value="seller">seller</option>
              <option value="advertiser">advertiser</option>
              <option value="manager">manager</option>
              <option value="dealer_admin">dealer_admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Estado *</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
              <option value="suspended">suspended</option>
              <option value="cancelled">cancelled</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              suspended/cancelled deshabilitan el login salvo que marques lo contrario abajo.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">tenantId</label>
            <input
              className="w-full border rounded px-3 py-2 font-mono text-sm"
              placeholder="Vacío = borrar en Firestore"
              value={form.tenantId}
              onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">dealerId</label>
            <input
              className="w-full border rounded px-3 py-2 font-mono text-sm"
              placeholder="Vacío = borrar"
              value={form.dealerId}
              onChange={(e) => setForm({ ...form, dealerId: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">membershipId</label>
            <input
              className="w-full border rounded px-3 py-2 font-mono text-sm"
              value={form.membershipId}
              onChange={(e) => setForm({ ...form, membershipId: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">membershipType</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={form.membershipType}
              onChange={(e) => setForm({ ...form, membershipType: e.target.value as 'dealer' | 'seller' })}
            >
              <option value="dealer">dealer</option>
              <option value="seller">seller</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">Bio</label>
            <textarea
              className="w-full border rounded px-3 py-2"
              rows={3}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">URL foto (photo)</label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              value={form.photo}
              onChange={(e) => setForm({ ...form, photo: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">URL video catálogo (publicPromoVideoUrl)</label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              value={form.publicPromoVideoUrl}
              onChange={(e) => setForm({ ...form, publicPromoVideoUrl: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Email corporativo</label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              value={form.corporateEmail}
              onChange={(e) => setForm({ ...form, corporateEmail: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Código de referido</label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              value={form.referralCode}
              onChange={(e) => setForm({ ...form, referralCode: e.target.value })}
            />
          </div>

          <div className="md:col-span-2 border rounded-lg p-4 bg-gray-50">
            <label className="flex items-center gap-2 font-medium">
              <input
                type="checkbox"
                checked={form.authDisabled}
                onChange={(e) => setForm({ ...form, authDisabled: e.target.checked })}
              />
              Cuenta deshabilitada en Firebase Auth (no puede iniciar sesión)
            </label>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">Nueva contraseña (opcional)</label>
            <input
              type="password"
              autoComplete="new-password"
              className="w-full border rounded px-3 py-2"
              placeholder="Mínimo 6 caracteres; vacío = no cambiar"
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">Settings (JSON)</label>
            <label className="flex items-center gap-2 text-sm mb-2">
              <input
                type="checkbox"
                checked={form.settingsReplace}
                onChange={(e) => setForm({ ...form, settingsReplace: e.target.checked })}
              />
              Reemplazar settings por completo (si no, se fusiona con lo existente)
            </label>
            <textarea
              className="w-full border rounded px-3 py-2 font-mono text-xs min-h-[140px]"
              value={form.settingsJson}
              onChange={(e) => setForm({ ...form, settingsJson: e.target.value })}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">Permissions (JSON, gerentes / dealer_admin)</label>
            <label className="flex items-center gap-2 text-sm mb-2">
              <input
                type="checkbox"
                checked={form.clearPermissions}
                onChange={(e) => setForm({ ...form, clearPermissions: e.target.checked })}
              />
              Borrar objeto permissions en Firestore
            </label>
            <textarea
              className="w-full border rounded px-3 py-2 font-mono text-xs min-h-[120px]"
              disabled={form.clearPermissions}
              value={form.permissionsJson}
              onChange={(e) => setForm({ ...form, permissionsJson: e.target.value })}
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end border-t pt-4">
          <Link href="/admin/users" className="px-4 py-2 border rounded">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar todo'}
          </button>
        </div>
      </form>
    </div>
  );
}
