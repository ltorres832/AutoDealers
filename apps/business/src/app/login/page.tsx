'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ForgotPasswordPanel } from '@/components/ForgotPasswordPanel';

const PUBLIC_WEB =
  process.env.NEXT_PUBLIC_PUBLIC_WEB_URL?.replace(/\/$/, '') || 'https://www.autodealers-online.com';

function LoginShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="brand-login-shell brand-top-accent bg-white">
      <header className="brand-login-header">
        <img
          src="/brand/ad-platform-logo.png"
          alt="AutoDealersOnline"
          className="mx-auto h-12 w-auto object-contain"
        />
        <h1 className="mt-3 text-2xl font-black tracking-tight text-white">Panel de negocio</h1>
        <p className="mt-1 text-sm text-white/90">Talleres, gomeras, detailing y servicios automotrices</p>
      </header>
      <div className="brand-login-body">{children}</div>
    </div>
  );
}

function BusinessLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/business/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        const next = searchParams.get('next');
        const safe = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
        router.push(safe);
      } else {
        setError(data.error || 'Error al iniciar sesión');
      }
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <LoginShell>
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-black text-gray-900">Iniciar sesión</h2>
          <p className="mt-1 text-sm text-gray-600">
            Administra citas, clientes, estimados y pagos de tu negocio
          </p>
        </div>

        {error ? (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none ring-primary-500 focus:border-primary-500 focus:ring-2"
              type="email"
              autoComplete="email"
              required
              placeholder="tu@negocio.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <input
              id="password"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none ring-primary-500 focus:border-primary-500 focus:ring-2"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>
          <button
            disabled={loading}
            className="w-full rounded-xl bg-primary-600 py-3 font-bold text-white transition hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar al panel'}
          </button>
        </form>

        <ForgotPasswordPanel />

        <p className="mt-6 text-center text-sm text-gray-600">
          ¿Aún no tienes cuenta?{' '}
          <a
            href={`${PUBLIC_WEB}/registro/negocio`}
            className="font-semibold text-primary-600 hover:text-primary-800"
          >
            Registra tu negocio
          </a>
        </p>
      </div>
    </LoginShell>
  );
}

export default function BusinessLoginPage() {
  return (
    <Suspense
      fallback={
        <LoginShell>
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
        </LoginShell>
      }
    >
      <BusinessLoginForm />
    </Suspense>
  );
}
