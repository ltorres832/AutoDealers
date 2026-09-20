'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('appResetToken') || '';
  const appKey = searchParams.get('appKey') || '';
  const continueUrl = searchParams.get('continueUrl') || '/login';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const safeContinueUrl = useMemo(() => {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.autodealers-online.com';
      return new URL(continueUrl, origin).toString();
    } catch {
      return '/login';
    }
  }, [continueUrl]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (!token) return setError('El enlace no contiene un token válido.');
    if (!appKey) return setError('El enlace no identifica la app. Solicita uno nuevo desde el login correcto.');
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
    if (password !== confirm) return setError('Las contraseñas no coinciden.');

    setLoading(true);
    try {
      const res = await fetch('/api/auth/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, appKey, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo actualizar la contraseña.');
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-12">
      <div className="w-full max-w-md rounded-xl border-t-4 border-primary-600 bg-white p-8 shadow-xl">
        <Link href="/" className="text-sm font-medium text-primary-600 hover:underline">
          Volver a AutoDealersOnline
        </Link>
        <h1 className="mt-5 mb-2 text-2xl font-bold text-gray-900">Nueva contraseña</h1>
        <p className="mb-6 text-sm text-gray-600">
          Este cambio aplica únicamente a la app desde donde solicitaste el enlace.
        </p>

        {done ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              Contraseña actualizada correctamente.
            </div>
            <a
              href={safeContinueUrl}
              className="block w-full rounded-lg bg-primary-600 px-4 py-3 text-center font-semibold text-white hover:bg-primary-700"
            >
              Volver al login
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {!token ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                El enlace no es válido. Solicita uno nuevo desde el login de tu app.
              </div>
            ) : null}
            {token && !appKey ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                El enlace no identifica la app. Solicita uno nuevo desde el login correcto.
              </div>
            ) : null}
            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
            <label className="block text-sm font-medium text-gray-700">
              Nueva contraseña
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                minLength={6}
                required
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Confirmar contraseña
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                minLength={6}
                required
              />
            </label>
            <button
              type="submit"
              disabled={loading || !token || !appKey}
              className="w-full rounded-lg bg-primary-600 px-4 py-3 font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default function AppPasswordResetPage() {
  return (
    <Suspense fallback={<main className="p-8 text-center text-sm text-gray-600">Cargando enlace...</main>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
