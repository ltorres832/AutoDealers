'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { ForgotPasswordPanel } from '@/components/ForgotPasswordPanel';
import { getFirebaseClient } from '@/lib/firebase-client';

function AdvertiserLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const firebase = getFirebaseClient();
      if (!firebase?.app) {
        setError(
          'Firebase no está configurado en esta app. Revisa las variables NEXT_PUBLIC_FIREBASE_* en App Hosting.'
        );
        return;
      }

      const userCred = await signInWithEmailAndPassword(
        getAuth(firebase.app),
        formData.email.trim(),
        formData.password
      );
      const idToken = await userCred.user.getIdToken();

      const response = await fetch('/api/advertiser/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      // Verificar Content-Type antes de parsear
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Expected JSON but got:', contentType, text.substring(0, 200));
        setError('Error del servidor. Por favor intenta de nuevo.');
        return;
      }

      const data = await response.json();

      if (response.ok) {
        const next = searchParams.get('next');
        const safe =
          next && next.startsWith('/') && !next.startsWith('//')
            ? next
            : '/dashboard';
        router.push(safe);
      } else {
        setError(data.error || 'Error al iniciar sesión');
      }
    } catch (err: any) {
      console.error('Error logging in:', err);
      const code = err?.code as string | undefined;
      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found' ||
        code === 'auth/invalid-email'
      ) {
        setError('Credenciales inválidas');
        return;
      }
      if (err.message && err.message.includes('Failed to fetch')) {
        setError('No se pudo conectar con el servidor. Asegúrate de que el servidor esté corriendo en el puerto 3004.');
      } else if (err.message && (err.message.includes('JSON') || err.message.includes('DOCTYPE'))) {
        setError('Error al procesar la respuesta del servidor.');
      } else {
        setError(err.message || 'Error al iniciar sesión');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="brand-login-shell brand-top-accent">
      <header className="brand-login-header">
        <h1 className="text-2xl font-bold tracking-tight">AutoDealers</h1>
        <p className="text-sm text-white/90 mt-1">Panel de Anunciante</p>
      </header>
      <div className="brand-login-body">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border-t-4 border-primary-600">
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            Iniciar sesión
          </h2>
          <p className="text-gray-600 text-sm">
            Gestiona tus campañas publicitarias
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary-600 to-primary-600 text-white px-6 py-3 rounded-lg hover:from-primary-700 hover:to-primary-700 font-semibold transition-all disabled:opacity-50"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <ForgotPasswordPanel />

        <div className="mt-6 text-center">
          <Link href="/register" className="text-primary-600 hover:text-primary-700 text-sm">
            ¿No tienes cuenta? Regístrate aquí
          </Link>
        </div>
      </div>
      </div>
    </div>
  );
}

export default function AdvertiserLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
        </div>
      }
    >
      <AdvertiserLoginForm />
    </Suspense>
  );
}
