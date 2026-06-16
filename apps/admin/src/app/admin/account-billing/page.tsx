'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AdminMembershipAccessPanel } from '@/components/AdminMembershipAccessPanel';

type UserHit = {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId?: string;
  dealerId?: string;
};

export default function AdminAccountBillingPage() {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserHit | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setSearching(true);
    setError(null);
    setUser(null);

    try {
      const isEmail = q.includes('@');
      const url = isEmail
        ? `/api/admin/users?search=${encodeURIComponent(q)}&limit=5`
        : null;

      if (isEmail && url) {
        const res = await fetch(url, { credentials: 'include' });
        const data = await res.json().catch(() => ({}));
        const list = Array.isArray(data.users) ? data.users : [];
        const hit = list.find(
          (u: UserHit) => (u.email || '').toLowerCase() === q.toLowerCase()
        ) || list[0];
        if (!hit?.id) {
          setError('No se encontró usuario con ese email');
          return;
        }
        setUser(hit);
        return;
      }

      const res = await fetch(`/api/admin/users/${encodeURIComponent(q)}`, {
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Usuario no encontrado');
        return;
      }
      const u = data.user || {};
      setUser({
        id: String(u.id || q),
        name: String(u.name || ''),
        email: String(u.email || ''),
        role: String(u.role || ''),
        tenantId: u.tenantId ? String(u.tenantId) : undefined,
        dealerId: u.dealerId ? String(u.dealerId) : undefined,
      });
    } catch {
      setError('Error de red');
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Sin facturación / Demo</h1>
      <p className="text-gray-600 mb-6">
        Activa o revoca membresía sin cobro para vendedores y dealers independientes. Busca por{' '}
        <strong>UID</strong> o <strong>email</strong>.
      </p>

      <form onSubmit={handleSearch} className="bg-white rounded-lg border p-4 mb-6 flex flex-wrap gap-3">
        <input
          type="text"
          className="flex-1 min-w-[200px] border rounded-lg px-3 py-2"
          placeholder="UID o email (ej. portiz@yokomuropr.com)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="submit"
          disabled={searching}
          className="px-5 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
        >
          {searching ? 'Buscando…' : 'Buscar'}
        </button>
      </form>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm">
          {error}
        </div>
      ) : null}

      {user ? (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border p-4">
            <p className="font-medium">{user.name || '—'}</p>
            <p className="text-sm text-gray-600">{user.email}</p>
            <p className="text-xs text-gray-500 mt-1">
              Rol: {user.role} ·{' '}
              <Link href={`/admin/users/${user.id}/edit`} className="text-primary-600 hover:underline">
                Abrir edición completa
              </Link>
            </p>
          </div>
          <AdminMembershipAccessPanel
            userId={user.id}
            role={user.role}
            dealerId={user.dealerId}
          />
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          También puedes ir a{' '}
          <Link href="/admin/sellers" className="text-primary-600 hover:underline">
            Vendedores
          </Link>{' '}
          → <strong>Sin facturación / Demo</strong> en cada fila.
        </p>
      )}
    </div>
  );
}
